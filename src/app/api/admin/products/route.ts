/**
 * Admin products API — full CRUD surface for the catalog manager.
 *
 * POST   /api/admin/products        → create a product (+ optional variants)
 * PATCH  /api/admin/products        → update any product field (name, price,
 *                                      description, story, materials, status…)
 *
 * Both are guarded by the admin session (404 otherwise) and audit-logged.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdminGuard } from "@/lib/api";
import { audit } from "@/lib/admin-auth";
import { adminProductSchema } from "@/lib/validation";

export const runtime = "nodejs";

/** Slugify a name — used when the admin doesn't supply one explicitly. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export const POST = withAdminGuard(async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = adminProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }
  const input = parsed.data;

  const slug = input.slug && input.slug.length >= 2 ? input.slug : slugify(input.name);
  const exists = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (exists) {
    return NextResponse.json({ error: `A product with slug "${slug}" already exists` }, { status: 409 });
  }

  const product = await prisma.product.create({
    data: {
      name: input.name,
      slug,
      description: input.description,
      story: input.story || null,
      category: input.category,
      status: input.status,
      basePrice: input.basePrice,
      currency: input.currency,
      dropName: input.dropName || null,
      isFeatured: input.isFeatured,
      materials: input.materials,
      images: input.images,
    },
    select: { id: true, slug: true, name: true },
  });

  await audit({
    session: req.session,
    action: "product.created",
    entity: "Product",
    entityId: product.slug,
    detail: { name: product.name, category: input.category, basePrice: input.basePrice },
  });

  return NextResponse.json({ ok: true, product }, { status: 201 });
});

export const PATCH = withAdminGuard(async (req) => {
  const body = await req.json().catch(() => null);
  const schema = adminProductSchema.partial().extend({
    productId: z.string().min(1),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }
  const { productId, ...data } = parsed.data;

  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, slug: true, name: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.slug !== undefined && data.slug.length >= 2) update.slug = data.slug;
  if (data.description !== undefined) update.description = data.description;
  if (data.story !== undefined) update.story = data.story || null;
  if (data.category !== undefined) update.category = data.category;
  if (data.status !== undefined) update.status = data.status;
  if (data.basePrice !== undefined) update.basePrice = data.basePrice;
  if (data.currency !== undefined) update.currency = data.currency;
  if (data.dropName !== undefined) update.dropName = data.dropName || null;
  if (data.isFeatured !== undefined) update.isFeatured = data.isFeatured;
  if (data.materials !== undefined) update.materials = data.materials;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const product = await prisma.product.update({
    where: { id: productId },
    data: update,
    select: { id: true, slug: true, name: true },
  });

  await audit({
    session: req.session,
    action: "product.updated",
    entity: "Product",
    entityId: product.slug,
    detail: update,
  });

  return NextResponse.json({ ok: true, product });
});
