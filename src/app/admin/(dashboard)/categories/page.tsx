import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CategoryManager } from "@/components/admin/CategoryManager";

export const metadata: Metadata = { title: "Categories", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const [settings, counts] = await Promise.all([
    prisma.categorySetting.findMany(),
    prisma.product.groupBy({ by: ["category"], _count: { _all: true } }),
  ]);
  const countBy = new Map(counts.map((c) => [c.category, c._count._all]));

  const CATEGORY_VALUES = ["OUTERWEAR", "KNITWEAR", "TOPS", "BOTTOMS", "ACCESSORIES", "FOOTWEAR"] as const;

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <p className="label-rohde">Rohde Studio · Catalog</p>
        <h1 className="mt-2 font-display text-2xl font-bold uppercase tracking-tighter2 text-charcoal md:text-3xl">
          Category names
        </h1>
        <p className="mt-2 text-sm text-concrete">
          The words customers see across the store — product cards, filters and
          the concierge. The underlying grouping stays fixed for inventory and
          analytics; the naming is yours.
        </p>
      </header>

      <CategoryManager
        categories={CATEGORY_VALUES.map((value) => ({
          value,
          label: settings.find((s) => s.category === value)?.label ?? value,
          productCount: countBy.get(value) ?? 0,
        }))}
      />
    </div>
  );
}
