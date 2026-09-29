/**
 * Admin payments API — WhatsApp / mobile-money order operations.
 *
 * GET  /api/admin/payments?filter=review|all&q=… → order ledger for the dashboard
 * POST /api/admin/payments → actions (all audit-logged):
 *   - { action: "verify", orderId, reference, amount, currency?, provider? }
 *       Records a VERIFIED payment (admin-confirmed transaction). Reuses the
 *       same ledger engine as the bot: duplicate-reference protection and
 *       under/overpayment handling are identical.
 *   - { action: "under_review", orderId }  → flag for manual follow-up
 *   - { action: "reject", orderId }        → mark payment rejected (no stock commit)
 *   - { action: "cancel", orderId }        → cancel unpaid order + release stock
 */
import { NextResponse } from "next/server";
import z from "zod";
import { prisma } from "@/lib/prisma";
import { withAdminGuard } from "@/lib/api";
import { audit } from "@/lib/admin-auth";
import { recordVerifiedPayment, ReferenceReuseError, type TrustedTx } from "@/lib/payments/verification";
import { releaseStock } from "@/lib/inventory";

export const runtime = "nodejs";

const actionSchema = z.object({
  action: z.enum(["verify", "under_review", "reject", "cancel"]),
  orderId: z.string().min(1),
  reference: z.string().trim().min(3).max(80).optional(),
  amount: z.number().positive().max(1_000_000_000).optional(),
  currency: z.string().trim().length(3).optional(),
  provider: z.string().trim().max(40).optional(),
  note: z.string().trim().max(300).optional(),
});

export const GET = withAdminGuard(async (req) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 60);

  const searchClause = q
    ? {
        OR: [
          { orderNumber: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { whatsappPhone: { contains: q } },
        ],
      }
    : {};

  const orders = await prisma.order.findMany({
    where: {
      channel: "whatsapp",
      ...searchClause,
    },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { createdAt: "desc" }, take: 5 },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    orders: orders.map((o) => {
      const verifiedPayments = o.payments.filter((p) => p.status === "VERIFIED" || p.status === "CAPTURED");
      const verified = verifiedPayments.reduce((s, p) => s + parseFloat(p.amount.toString()), 0);
      const total = parseFloat((o.localAmount ?? o.total).toString());
      const currency = o.localCurrency ?? o.currency;
      const paid = o.status === "CONFIRMED" || o.paymentStatus === "PAID";
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        channel: o.channel,
        status: o.status,
        paymentStatus: o.paymentStatus,
        waState: o.waState,
        customer: o.shippingName,
        phone: o.whatsappPhone ?? o.shippingPhone,
        email: o.email,
        address: [o.shippingLine1, o.shippingLine2, o.shippingCity, o.shippingRegion, o.shippingCountry]
          .filter(Boolean)
          .join(", "),
        deliveryInstructions: o.deliveryInstructions,
        total,
        currency,
        verified,
        balance: paid ? 0 : Math.max(0, total - verified),
        overpaid: Math.max(0, verified - total),
        provider: o.provider,
        expiresAt: o.expiresAt,
        createdAt: o.createdAt,
        items: o.items.map((i) => ({
          productName: i.productName,
          size: i.size,
          color: i.color,
          quantity: i.quantity,
          unitPrice: parseFloat(i.unitPrice.toString()),
        })),
        payments: o.payments.map((p) => ({
          id: p.id,
          provider: p.provider,
          status: p.status,
          amount: parseFloat(p.amount.toString()),
          currency: p.currency,
          providerRef: p.providerRef,
          sender: p.sender,
          receiver: p.receiver,
          verificationSource: p.verificationSource,
          verifiedAt: p.verifiedAt,
          createdAt: p.createdAt,
        })),
        recentEvents: o.events.map((e) => ({ kind: e.kind, message: e.message, createdAt: e.createdAt })),
      };
    }),
  });
});

export const POST = withAdminGuard(async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }
  const { action, orderId, reference, amount, currency, provider, note } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  switch (action) {
    case "verify": {
      if (!reference || amount === undefined) {
        return NextResponse.json({ error: "reference and amount are required" }, { status: 400 });
      }
      if (order.status === "FAILED" || order.status === "CANCELLED") {
        return NextResponse.json({ error: "Order is closed" }, { status: 409 });
      }
      const tx: TrustedTx = {
        reference,
        amount,
        currency: (currency ?? order.localCurrency ?? order.currency).toUpperCase(),
        sender: null,
        receiver: null,
        timestamp: new Date(),
        provider: provider ?? "MTN",
        source: "admin",
      };
      try {
        const outcome = await recordVerifiedPayment({ order, tx, adminSession: req.session });
        return NextResponse.json({ ok: true, outcome: outcome.kind });
      } catch (err) {
        if (err instanceof ReferenceReuseError) {
          return NextResponse.json(
            { error: `That reference already settled order ${err.orderNumber}` },
            { status: 409 }
          );
        }
        throw err;
      }
    }

    case "under_review": {
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "UNDER_REVIEW", waState: "under_review" },
      });
      await prisma.orderEvent.create({
        data: {
          orderId: order.id,
          kind: "payment.under_review",
          message: note ?? "Flagged for manual review by admin",
        },
      });
      await audit({
        session: req.session,
        action: "payment.under_review",
        entity: "Order",
        entityId: order.orderNumber,
        detail: { note },
      });
      return NextResponse.json({ ok: true, paymentStatus: updated.paymentStatus });
    }

    case "reject": {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "REJECTED" },
      });
      await prisma.orderEvent.create({
        data: {
          orderId: order.id,
          kind: "payment.rejected",
          message: note ?? "Payment rejected by admin",
        },
      });
      await audit({
        session: req.session,
        action: "payment.rejected",
        entity: "Order",
        entityId: order.orderNumber,
        detail: { note },
      });
      return NextResponse.json({ ok: true });
    }

    case "cancel": {
      if (order.status !== "PENDING") {
        return NextResponse.json({ error: "Only pending orders can be cancelled" }, { status: 409 });
      }
      await releaseStock(order.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })));
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", paymentStatus: "FAILED", waState: "expired" },
      });
      await prisma.orderEvent.create({
        data: {
          orderId: order.id,
          kind: "order.cancelled",
          message: note ?? "Cancelled by admin — stock released",
        },
      });
      await audit({
        session: req.session,
        action: "order.cancelled",
        entity: "Order",
        entityId: order.orderNumber,
        detail: { note },
      });
      return NextResponse.json({ ok: true });
    }
  }
});
