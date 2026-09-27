/**
 * Admin inventory API — guarded by the admin session (404 otherwise).
 * Writes stock and journals the adjustment to the audit log.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdminGuard } from "@/lib/api";
import { audit } from "@/lib/admin-auth";

const schema = z.object({
  variantId: z.string().min(1),
  onHand: z.number().int().min(0).max(100_000),
});

export const runtime = "nodejs";

export const PATCH = withAdminGuard(async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const variant = await prisma.variant.findUnique({
    where: { id: parsed.data.variantId },
    select: { id: true, sku: true },
  });
  if (!variant) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  }

  await prisma.inventory.upsert({
    where: { variantId: variant.id },
    update: { onHand: parsed.data.onHand },
    create: { variantId: variant.id, onHand: parsed.data.onHand },
  });

  await audit({
    session: req.session,
    action: "inventory.adjusted",
    entity: "Inventory",
    entityId: variant.sku,
    detail: { onHand: parsed.data.onHand },
  });

  return NextResponse.json({ ok: true });
});
