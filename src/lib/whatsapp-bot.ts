/**
 * WhatsApp bot conversation engine (server-side).
 *
 * The bot NEVER trusts message text as proof of payment — it resolves the
 * customer's active order from the database by phone number, extracts
 * evidence from any pasted confirmation, and hands it to the verification
 * engine. Replies stay short and human; technical detail goes to the
 * order-event trail, not the customer.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/lib/store-settings";
import { normalizePhone, composePaymentInstructions, composeBalanceReminder, composeOrderConfirmed } from "@/lib/whatsapp";
import { processCustomerConfirmation, type VerifyOutcome } from "@/lib/payments/verification";

/** Active = still awaiting payment or under verification. */
const ACTIVE_STATES = ["created", "instructions_sent", "awaiting_confirmation", "partially_paid", "under_review"];

export async function findActiveOrderForPhone(rawPhone: string) {
  const phone = normalizePhone(rawPhone);
  if (!phone) return null;
  const orders = await prisma.order.findMany({
    where: {
      channel: "whatsapp",
      whatsappPhone: { in: [phone, phone.slice(-9), `0${phone.slice(-9)}`] },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { items: true },
  });
  return orders.find((o) => ACTIVE_STATES.includes(o.waState ?? "") && o.status === "PENDING") ?? null;
}

/** Best-effort push via WhatsApp Cloud API; logs when credentials absent. */
async function sendWhatsAppReply(toPhone: string, text: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN ?? "";
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
  if (!token || !phoneId) {
    console.info("[whatsapp] reply (Cloud API not configured, logged only):", { toPhone, text: text.slice(0, 80) });
    return;
  }
  try {
    await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toPhone,
        type: "text",
        text: { body: text },
      }),
    });
  } catch (err) {
    console.error("[whatsapp] send failed", err);
  }
}

function outcomeReply(kind: VerifyOutcome["kind"], ctx: {
  orderNumber: string;
  verified: number;
  total: number;
  currency: string;
  address: string;
  estimate: string;
  excess: number;
}): string {
  const fmt = (n: number) => n.toLocaleString("en-US");
  switch (kind) {
    case "verified":
      return composeOrderConfirmed({
        orderNumber: ctx.orderNumber,
        amount: ctx.total + ctx.excess,
        currency: ctx.currency,
        address: ctx.address,
        estimate: ctx.estimate,
      });
    case "partial":
      return composeBalanceReminder({
        orderNumber: ctx.orderNumber,
        verified: ctx.verified,
        total: ctx.total,
        currency: ctx.currency,
      });
    case "duplicate":
      return "This transaction has already been used to confirm another order. Please send the confirmation for the payment made for this order.";
    case "unverifiable":
      return "We couldn't verify this payment. Please send the original payment confirmation for the transfer you made, including the transaction/reference number.";
    case "under_review":
      return "Thanks — your payment confirmation is being checked. We'll message you here as soon as it's verified. This usually takes a few minutes.";
  }
}

export async function handleIncomingMessage(params: {
  fromPhone: string;
  text: string;
  profileName?: string;
}): Promise<{ reply: string; handled: boolean }> {
  const { fromPhone, text } = params;
  const settings = await getStoreSettings();
  const order = await findActiveOrderForPhone(fromPhone);

  if (!order) {
    return {
      reply:
        "Hi! To place an order, shop on our website and tap “Complete Order on WhatsApp” — your order details will be attached automatically.",
      handled: true,
    };
  }

  const currency = order.localCurrency ?? order.currency;
  const total = parseFloat((order.localAmount ?? order.total).toString());
  const t = (text || "").toLowerCase();

  // Route: does the message look like payment evidence (amount/ref present)?
  const looksLikeEvidence = /(rwf|frw|ugx|tzs|kes|ghs|ngn|usd)|transaction|reference|\bref\b|\bid\b|confirmed|received|deposit/i.test(t);

  // Route: order status questions.
  if (!looksLikeEvidence && /(status|where|order|received|gone through|confirm)/.test(t)) {
    const payments = await prisma.payment.findMany({
      where: { orderId: order.id, status: { in: ["VERIFIED", "CAPTURED"] } },
    });
    const verified = payments.reduce((s, p) => s + parseFloat(p.amount.toString()), 0);
    if (order.status === "CONFIRMED") {
      const area = settings.deliveryAreas.find((a) =>
        order.shippingCity.toLowerCase().includes(a.name.split("—")[0]?.trim().toLowerCase() ?? "")
      );
      return {
        reply: composeOrderConfirmed({
          orderNumber: order.orderNumber,
          amount: total,
          currency,
          address: `${order.shippingLine1}, ${order.shippingCity}`,
          estimate: area?.estimate ?? "1–2 business days",
        }),
        handled: true,
      };
    }
    if (verified > 0) {
      return {
        reply: composeBalanceReminder({ orderNumber: order.orderNumber, verified, total, currency }),
        handled: true,
      };
    }
    return {
      reply: composePaymentInstructions({
        total,
        currency,
        momo: settings.momo,
      }),
      handled: true,
    };
  }

  // Otherwise treat as payment evidence and run the verification pipeline.
  const expectedReceiver = settings.momo.number.replace(/\D/g, "");
  const { outcome } = await processCustomerConfirmation({
    order,
    message: text,
    expectedReceiver,
  });

  const payments = await prisma.payment.findMany({
    where: { orderId: order.id, status: { in: ["VERIFIED", "CAPTURED"] } },
  });
  const verified = payments.reduce((s, p) => s + parseFloat(p.amount.toString()), 0);
  const area = settings.deliveryAreas.find((a) =>
    order.shippingCity.toLowerCase().includes(a.name.split("—")[0]?.trim().toLowerCase() ?? "")
  );

  const reply = outcomeReply(outcome.kind, {
    orderNumber: order.orderNumber,
    verified,
    total,
    currency,
    address: `${order.shippingLine1}, ${order.shippingCity}`,
    estimate: area?.estimate ?? "1–2 business days",
    excess: outcome.kind === "verified" ? outcome.excess : 0,
  });

  await sendWhatsAppReply(normalizePhone(fromPhone), reply);
  return { reply, handled: true };
}
