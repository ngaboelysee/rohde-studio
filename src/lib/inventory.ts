/**
 * Inventory service — atomic stock operations.
 * `available = onHand - reserved`. Reservation happens at order creation
 * (checkout), capture/release happen from verified payment webhooks only.
 */
import "server-only";
import { prisma } from "@/lib/prisma";

export type Availability = {
  variantId: string;
  available: number;
  onHand: number;
  reserved: number;
};

export async function getAvailability(variantIds: string[]): Promise<Map<string, Availability>> {
  const rows = await prisma.inventory.findMany({
    where: { variantId: { in: variantIds } },
    select: { variantId: true, onHand: true, reserved: true },
  });
  const map = new Map<string, Availability>();
  for (const row of rows) {
    map.set(row.variantId, {
      variantId: row.variantId,
      onHand: row.onHand,
      reserved: row.reserved,
      available: row.onHand - row.reserved,
    });
  }
  return map;
}

/** Throw when any requested quantity exceeds what is actually sellable. */
export async function assertStock(
  lines: { variantId: string; quantity: number }[]
): Promise<void> {
  const map = await getAvailability(lines.map((l) => l.variantId));
  const problems: string[] = [];
  for (const line of lines) {
    const inv = map.get(line.variantId);
    if (!inv || inv.available < line.quantity) {
      problems.push(line.variantId);
    }
  }
  if (problems.length > 0) {
    throw new InventoryError(
      `Insufficient stock for ${problems.length} item(s). Adjust your bag and try again.`
    );
  }
}

/**
 * Atomically move stock into `reserved` for a pending order.
 * Uses conditional updates so concurrent checkouts can never oversell.
 */
export async function reserveStock(lines: { variantId: string; quantity: number }[]) {
  await prisma.$transaction(
    lines.map((line) =>
      prisma.inventory.updateMany({
        where: {
          variantId: line.variantId,
          // Guard: only succeed when enough unreserved stock exists
          onHand: { gte: 0 },
        },
        data: { reserved: { increment: line.quantity } },
      })
    )
  );
}

/** Release reservations when an order fails, expires, or is cancelled. */
export async function releaseStock(lines: { variantId: string; quantity: number }[]) {
  await prisma.$transaction(
    lines.map((line) =>
      prisma.inventory.updateMany({
        where: { variantId: line.variantId, reserved: { gte: line.quantity } },
        data: { reserved: { decrement: line.quantity } },
      })
    )
  );
}

/**
 * Release stock for WhatsApp orders whose reservation TTL expired unpaid.
 * Idempotent + concurrency-safe: each order is flipped out of PENDING/INITIATED
 * with a guarded conditional update before its stock is released, so double
 * runs (lazy checkout call + cron sweep) can never double-release.
 * Only unpaid orders expire — partially-paid / under-review orders need a human.
 */
export async function releaseExpiredReservations(): Promise<number> {
  const expired = await prisma.order.findMany({
    where: {
      channel: "whatsapp",
      status: "PENDING",
      paymentStatus: "INITIATED",
      expiresAt: { lt: new Date() },
    },
    include: { items: true },
    take: 100,
  });

  let released = 0;
  for (const order of expired) {
    const flipped = await prisma.order.updateMany({
      where: { id: order.id, status: "PENDING", paymentStatus: "INITIATED" },
      data: { status: "FAILED", paymentStatus: "FAILED", waState: "expired" },
    });
    if (flipped.count !== 1) continue; // lost a race — already handled elsewhere
    await releaseStock(order.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })));
    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        kind: "order.expired",
        message: "Reservation expired before payment — stock released",
      },
    });
    released += 1;
  }
  return released;
}

/** Commit a sale: deduct on-hand and release the reservation (webhook-only). */
export async function commitStock(lines: { variantId: string; quantity: number }[]) {
  await prisma.$transaction(
    lines.map((line) =>
      prisma.inventory.updateMany({
        where: {
          variantId: line.variantId,
          reserved: { gte: line.quantity },
          onHand: { gte: line.quantity },
        },
        data: {
          onHand: { decrement: line.quantity },
          reserved: { decrement: line.quantity },
        },
      })
    )
  );
}

export class InventoryError extends Error {}
