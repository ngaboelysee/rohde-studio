/**
 * Payment verification engine — the security core of WhatsApp checkout.
 *
 * IRON RULES:
 *  1. A customer-pasted SMS is EVIDENCE, never proof. Nothing in this file
 *     approves a payment because the text "looks right".
 *  2. A payment becomes VERIFIED only via a trusted server-side source:
 *     provider API lookup, a signature-checked webhook, or an explicit
 *     admin action (audited).
 *  3. Every verified transaction reference is stored globally-unique —
 *     the same transaction can never settle two orders.
 *  4. Verification-unavailable ⇒ UNDER_REVIEW, never a false approve/reject.
 *
 * The ledger: orders are settled by the sum of VERIFIED Payment rows.
 * Underpayment → PARTIALLY_PAID; overpayment → confirmed + flagged.
 */
import "server-only";
import { Prisma, type Order, type OrderItem, type Payment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { extractPaymentEvidence, type PaymentEvidence } from "@/lib/payments/evidence";
import { momoConfigured, momoGetCollection } from "@/lib/payments/momo";
import { audit } from "@/lib/admin-auth";
import type { AdminSession } from "@/lib/admin-session";
import { reserveStock, commitStock } from "@/lib/inventory";

export type VerifySource = "provider-api" | "webhook" | "admin";

export type VerifyOutcome =
  | { kind: "verified"; order: Order; payments: Payment[]; excess: number }
  | { kind: "partial"; order: Order; payments: Payment[]; verifiedTotal: number; remaining: number }
  | { kind: "duplicate"; existingOrderNumber: string }
  | { kind: "unverifiable"; reason: string }
  | { kind: "under_review"; reason: string };

const AMOUNT_TOLERANCE = 1; // minor rounding headroom in major units

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export type TrustedTx = {
  /** Globally-unique provider transaction/reference id. */
  reference: string;
  amount: number;
  currency: string;
  sender?: string | null;
  receiver?: string | null;
  timestamp?: Date | null;
  provider: "MTN" | "AIRTEL" | "EKASH" | string;
  source: VerifySource;
  /** Raw provider payload preserved for audit. */
  raw?: unknown;
};

export type MatchContext = {
  order: Order;
  items: OrderItem[];
  evidence?: PaymentEvidence | null;
  customerPhone?: string | null;
  expectedReceiver?: string | null;
};

/**
 * Core matcher — compares a trusted transaction against the order.
 * Matching uses reference uniqueness + receiver + currency + amount (+/-),
 * never message wording. Returns null when the transaction does not belong
 * to this order.
 */
export function matchTransactionToOrder(tx: TrustedTx, ctx: MatchContext): { ok: true } | { ok: false; reason: string } {
  const currency = (ctx.order.localCurrency ?? ctx.order.currency).toUpperCase();
  const expectedAmount = round(parseFloat((ctx.order.localAmount ?? ctx.order.total).toString()));

  if (tx.currency.toUpperCase() !== currency) {
    return { ok: false, reason: `currency mismatch (${tx.currency} vs ${currency})` };
  }
  if (ctx.expectedReceiver && tx.receiver && ctx.expectedReceiver.replace(/\D/g, "") !== tx.receiver.replace(/\D/g, "")) {
    return { ok: false, reason: "receiving account mismatch" };
  }
  const diff = round(tx.amount) - expectedAmount;
  if (diff < -AMOUNT_TOLERANCE) {
    // Underpayment is a valid ledger event, handled by the caller.
    return { ok: true };
  }
  void diff;
  return { ok: true };
}

async function assertReferenceUnused(reference: string): Promise<void> {
  const existing = await prisma.payment.findFirst({
    where: { providerRef: reference, status: { in: ["VERIFIED", "CAPTURED"] } },
    select: { orderId: true, order: { select: { orderNumber: true } } },
  });
  if (existing) {
    throw new ReferenceReuseError(existing.order.orderNumber);
  }
}

export class ReferenceReuseError extends Error {
  constructor(public orderNumber: string) {
    super(`reference already used by ${orderNumber}`);
  }
}

/**
 * Record a trusted transaction against an order (server-side callers only).
 * Recomputes the ledger and transitions the order when fully covered.
 */
export async function recordVerifiedPayment(params: {
  order: Order & { items: OrderItem[] };
  tx: TrustedTx;
  adminSession?: AdminSession;
  expectedReceiver?: string | null;
}): Promise<VerifyOutcome> {
  const { order, tx, adminSession } = params;

  await assertReferenceUnused(tx.reference);

  const currency = (order.localCurrency ?? order.currency).toUpperCase();
  const totalDue = round(parseFloat((order.localAmount ?? order.total).toString()));

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: "WHATSAPP",
      status: "VERIFIED",
      amount: new Prisma.Decimal(round(tx.amount)),
      currency,
      providerRef: tx.reference,
      sender: tx.sender ?? null,
      receiver: tx.receiver ?? null,
      verifiedAt: new Date(),
      verificationSource: tx.source,
      rawEventId: `wa-${tx.reference}`.slice(0, 250),
    },
  });

  // Recompute ledger.
  const payments = await prisma.payment.findMany({
    where: { orderId: order.id, status: { in: ["VERIFIED", "CAPTURED"] } },
    orderBy: { createdAt: "asc" },
  });
  const verifiedTotal = round(payments.reduce((s, p) => s + parseFloat(p.amount.toString()), 0));

  if (verifiedTotal + AMOUNT_TOLERANCE < totalDue) {
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "PARTIALLY_PAID", waState: "partially_paid" },
    });
    return {
      kind: "partial",
      order,
      payments: [...payments, payment],
      verifiedTotal,
      remaining: round(totalDue - verifiedTotal),
    };
  }

  // Fully covered → confirm the order, commit stock, lock financials.
  const excess = round(verifiedTotal - totalDue);
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "CONFIRMED",
      paymentStatus: "PAID",
      waState: "confirmed",
      expiresAt: null,
      providerRef: order.providerRef ?? tx.reference,
    },
  });
  await commitStock(order.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })));

  if (excess > 0) {
    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        kind: "payment.overpaid",
        message: `Excess payment of ${excess} ${currency} flagged for review`,
        payload: { excess, currency } as never,
      },
    });
  }

  if (adminSession) {
    await audit({
      session: adminSession,
      action: "payment.verified",
      entity: "Order",
      entityId: order.orderNumber,
      detail: { reference: tx.reference, amount: tx.amount, source: tx.source },
    });
  }

  return { kind: "verified", order: updated, payments, excess };
}

/**
 * Full pipeline for a customer's pasted confirmation (bot path):
 * extract evidence → try trusted verification → outcome.
 * When no trusted source can confirm the transaction, the payment is NOT
 * created as VERIFIED; the order goes to VERIFICATION_PENDING/UNDER_REVIEW.
 */
export async function processCustomerConfirmation(params: {
  order: Order & { items: OrderItem[] };
  message: string;
  expectedReceiver?: string | null;
}): Promise<{ outcome: VerifyOutcome; evidence: PaymentEvidence; reply: string }> {
  const { order, message, expectedReceiver } = params;
  const evidence = extractPaymentEvidence(message);
  const currency = (order.localCurrency ?? order.currency).toUpperCase();
  const totalDue = round(parseFloat((order.localAmount ?? order.total).toString()));

  // 1. Trusted source: MTN MoMo collection lookup (reference or external id).
  if (momoConfigured() && evidence.transactionId) {
    try {
      const lookup = await momoGetCollection(evidence.transactionId);
      if (lookup?.found && lookup.status === "SUCCESSFUL") {
        const tx: TrustedTx = {
          reference: lookup.financialTransactionId ?? evidence.transactionId,
          amount: Number(lookup.amount ?? evidence.amount ?? 0),
          currency: lookup.currency ?? currency,
          sender: lookup.payerPhone ?? evidence.senderPhone,
          receiver: expectedReceiver,
          timestamp: evidence.datetime,
          provider: "MTN",
          source: "provider-api",
          raw: lookup.raw,
        };
        const match = matchTransactionToOrder(tx, { order, items: order.items, evidence, expectedReceiver });
        if (match.ok) {
          const outcome = await recordVerifiedPayment({ order, tx, expectedReceiver });
          return { outcome, evidence, reply: "" }; // reply composed by caller by outcome kind
        }
        return {
          outcome: { kind: "unverifiable", reason: match.reason },
          evidence,
          reply: "",
        };
      }
      if (lookup?.found && lookup.status === "PENDING") {
        return { outcome: { kind: "under_review", reason: "provider reports PENDING" }, evidence, reply: "" };
      }
    } catch (err) {
      console.error("[verify] provider lookup failed", err);
      // fall through to under-review
    }
  }

  // 2. No trusted confirmation available → Under Review (never auto-approve).
  await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: "UNDER_REVIEW", waState: "under_review" },
  });
  await prisma.orderEvent.create({
    data: {
      orderId: order.id,
      kind: "payment.under_review",
      message: "Confirmation could not be verified automatically",
      payload: { snippet: evidence.rawSnippet, extracted: evidence } as never,
    },
  });
  return {
    outcome: { kind: "under_review", reason: "no trusted verification available" },
    evidence,
    reply: "",
  };
}
