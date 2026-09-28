import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CategoryManager } from "@/components/admin/CategoryManager";

export const metadata: Metadata = { title: "Categories", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const [categories, counts] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.product.groupBy({ by: ["categoryId"], _count: { _all: true } }),
  ]);
  const countBy = new Map(counts.map((c) => [c.categoryId, c._count._all]));

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <p className="label-rohde">Rohde Studio · Catalog</p>
        <h1 className="mt-2 font-display text-2xl font-bold uppercase tracking-tighter2 text-charcoal md:text-3xl">
          Categories
        </h1>
        <p className="mt-2 text-sm text-concrete">
          Create new categories, rename any of them, reorder the filter bar and
          hide what you are not using. The naming and structure are entirely yours.
        </p>
      </header>

      <CategoryManager
        categories={categories.map((c) => ({
          id: c.id,
          slug: c.slug,
          label: c.label,
          sortOrder: c.sortOrder,
          isActive: c.isActive,
          productCount: countBy.get(c.id) ?? 0,
        }))}
      />
    </div>
  );
}
