/**
 * Admin variants API — per-colour identity for a product's variants.
 *
 * PATCH /api/admin/variants → set a variant's colour display name and/or its
 * dedicated photograph (the per-colour photo shown on the PDP when that
 * colour is selected).
 *
 * Guarded (404 otherwise) and audit-logged. Photo URLs come from the admin
 * upload API (Supabase Storage) or any https URL the admin pastes.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdminGuard } from "@/lib/api";
import { audit } from "@/lib/admin-auth";

export const runtime = "nodejs";

const patchSchema = z.object({
  variantId: z.string().min(1),
  color: z.string().trim().min(1).max(40).optional(),
  /** https URL from the upload API, or null to clear. */
  image: z.string().url().max(2048).nullable().optional(),
});

export const PATCH = withAdminGuard(async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }

  const { variantId, ...data } = parsed.data;
  const update: Record<string, unknown> = {};
  if (data.color !== undefined) update.color = data.color;
  if (data.image !== undefined) update.image = data.image;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const existing = await prisma.variant.findUnique({
    where: { id: variantId },
    select: { id: true, sku: true, product: { select: { slug: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  }

  const variant = await prisma.variant.update({
    where: { id: variantId },
    data: update,
    select: { id: true, sku: true, color: true, image: true },
  });

  await audit({
    session: req.session,
    action: "variant.updated",
    entity: "Variant",
    entityId: variant.sku,
    detail: update,
  });

  return NextResponse.json({ ok: true, variant });
});
