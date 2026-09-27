/**
 * Webhook fulfillment core. Signature verification happens in each route
 * (they have different raw-body requirements); this module owns what happens
 * AFTER a signature is trusted: idempotent order updates + stock commit.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { commitStock } from "@/lib/inventory";
import type { PaymentProvider } from "@prisma/client";

export type FulfillOrderInput = {
  orderNumber: string;
  provider: PaymentProvider;
  providerRef: string;
  eventId: string; // idempotency key
  amount?: number;
  currency?: string;
};

/**
 * Idempotently mark an order PAID and commit stock. Multiple webhooks /
 * retries converge safely via the unique Payment.rawEventId.
 */
export async function fulfillOrderFromWebhook(input: FulfillOrderInput): Promise<
  { ok: true; duplicate: boolean } | { ok: false; reason: string }
> {
  // Idempotency: a Payment row bound to this event id means we already ran.
  const existing = await prisma.payment.findUnique({
    where: { rawEventId: input.eventId },
    select: { id: true },
  });
  if (existing) return { ok: true, duplicate: true };

  const order = await prisma.order.findUnique({
    where: { orderNumber: input.orderNumber },
    include: { items: true },
  });
  if (!order) return { ok: false, reason: "order_not_found" };
  if (order.status === "PAID" || order.status === "FULFILLED") {
    return { ok: true, duplicate: true };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          orderId: order.id,
          provider: input.provider,
          status: "CAPTURED",
          amount: input.amount ?? order.total,
          currency: input.currency ?? order.currency,
          providerRef: input.providerRef,
          rawEventId: input.eventId,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: "PAID", paymentStatus: "CAPTURED", providerRef: input.providerRef },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          kind: "payment.captured",
          message: `Payment captured via ${input.provider}`,
          payload: { providerRef: input.providerRef },
        },
      });
    });

    // Stock commits only after the ledger row exists.
    await commitStock(
      order.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }))
    );

    return { ok: true, duplicate: false };
  } catch {
    // Unique-violation race with a concurrent webhook → treat as duplicate.
    const dupe = await prisma.payment.findUnique({
      where: { rawEventId: input.eventId },
      select: { id: true },
    });
    if (dupe) return { ok: true, duplicate: true };
    return { ok: false, reason: "fulfillment_failed" };
  }
}

export async function markOrderFailed(input: {
  orderNumber: string;
  provider: PaymentProvider;
  eventId: string;
  reason?: string;
}): Promise<void> {
  const existing = await prisma.payment.findUnique({
    where: { rawEventId: input.eventId },
    select: { id: true },
  });
  if (existing) return;

  const order = await prisma.order.findUnique({
    where: { orderNumber: input.orderNumber },
    include: { items: true },
  });
  if (!order || order.status !== "PENDING") return;

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        orderId: order.id,
        provider: input.provider,
        status: "FAILED",
        amount: order.total,
        currency: order.currency,
        rawEventId: input.eventId,
      },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { status: "FAILED", paymentStatus: "FAILED" },
    });
    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        kind: "payment.failed",
        message: input.reason ?? "Payment failed",
      },
    });
  });
}
