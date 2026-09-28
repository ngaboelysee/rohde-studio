/**
 * Admin categories API — categories are real, admin-managed rows.
 *
 * GET   /api/admin/categories  → all categories + product counts
 * POST  /api/admin/categories  → create a new category ({ label, sortOrder? })
 * PATCH /api/admin/categories  → rename / reorder / hide ({ id, … })
 *
 * Guarded (404 otherwise) and audit-logged. There is no delete: categories
 * with products cannot be removed (FK restrict) — deactivate instead, which
 * hides them from the storefront while preserving history.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminGuard } from "@/lib/api";
import { audit } from "@/lib/admin-auth";
import { adminCategorySchema, adminCategoryUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

/** Slugify a label — stable key used by URLs and the concierge. */
function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const GET = withAdminGuard(async () => {
  const [categories, counts] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.product.groupBy({ by: ["categoryId"], _count: { _all: true } }),
  ]);
  const countBy = new Map(counts.map((c) => [c.categoryId, c._count._all]));

  return NextResponse.json({
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      label: c.label,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      productCount: countBy.get(c.id) ?? 0,
    })),
  });
});

export const POST = withAdminGuard(async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = adminCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }

  const { label, sortOrder } = parsed.data;
  const slug = slugify(label);
  if (slug.length < 2) {
    return NextResponse.json({ error: "Category name produces an invalid URL key" }, { status: 400 });
  }

  const exists = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  if (exists) {
    return NextResponse.json({ error: `A category like \"${label}\" already exists` }, { status: 409 });
  }

  const category = await prisma.category.create({
    data: { label, slug, sortOrder: sortOrder ?? 0 },
    select: { id: true, slug: true, label: true, sortOrder: true, isActive: true },
  });

  await audit({
    session: req.session,
    action: "category.created",
    entity: "Category",
    entityId: category.slug,
    detail: { label: category.label },
  });

  return NextResponse.json({ ok: true, category }, { status: 201 });
});

export const PATCH = withAdminGuard(async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = adminCategoryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }

  const { id, ...data } = parsed.data;
  const update: Record<string, unknown> = {};
  if (data.label !== undefined) update.label = data.label;
  if (data.sortOrder !== undefined) update.sortOrder = data.sortOrder;
  if (data.isActive !== undefined) update.isActive = data.isActive;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const existing = await prisma.category.findUnique({ where: { id }, select: { slug: true } });
  if (!existing) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const category = await prisma.category.update({
    where: { id },
    data: update,
    select: { id: true, slug: true, label: true, sortOrder: true, isActive: true },
  });

  await audit({
    session: req.session,
    action: "category.updated",
    entity: "Category",
    entityId: category.slug,
    detail: update,
  });

  return NextResponse.json({ ok: true, category });
});
