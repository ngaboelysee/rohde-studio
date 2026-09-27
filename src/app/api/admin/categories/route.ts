/**
 * Admin categories API — the admin owns the customer-facing display names.
 *
 * GET  /api/admin/categories  → all six enum values + saved labels + usage counts
 * PUT  /api/admin/categories  → upsert labels (and sort order) per category
 *
 * Guarded (404 otherwise) and audit-logged. The Prisma enum itself stays
 * fixed — filters, garment mapping and analytics depend on it — but the
 * words customers see are entirely the admin's.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdminGuard } from "@/lib/api";
import { audit } from "@/lib/admin-auth";

export const runtime = "nodejs";

const CATEGORY_VALUES = ["OUTERWEAR", "KNITWEAR", "TOPS", "BOTTOMS", "ACCESSORIES", "FOOTWEAR"] as const;

const putSchema = z.object({
  labels: z
    .array(
      z.object({
        category: z.enum(CATEGORY_VALUES),
        label: z.string().trim().min(2, "Label too short").max(40, "Label too long"),
        sortOrder: z.number().int().min(0).max(999).optional(),
      })
    )
    .min(1)
    .max(6),
});

export const GET = withAdminGuard(async () => {
  const [settings, counts] = await Promise.all([
    prisma.categorySetting.findMany(),
    prisma.product.groupBy({ by: ["category"], _count: { _all: true } }),
  ]);

  const countBy = new Map(counts.map((c) => [c.category, c._count._all]));

  return NextResponse.json({
    categories: CATEGORY_VALUES.map((value) => ({
      value,
      label: settings.find((s) => s.category === value)?.label ?? value,
      sortOrder: settings.find((s) => s.category === value)?.sortOrder ?? 0,
      productCount: countBy.get(value) ?? 0,
    })),
  });
});

export const PUT = withAdminGuard(async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }

  for (const { category, label, sortOrder } of parsed.data.labels) {
    await prisma.categorySetting.upsert({
      where: { category },
      update: { label, ...(sortOrder !== undefined ? { sortOrder } : {}) },
      create: { category, label, sortOrder: sortOrder ?? 0 },
    });
  }

  await audit({
    session: req.session,
    action: "categories.updated",
    entity: "CategorySetting",
    detail: { labels: parsed.data.labels.map((l) => `${l.category}→${l.label}`) },
  });

  return NextResponse.json({ ok: true });
});
