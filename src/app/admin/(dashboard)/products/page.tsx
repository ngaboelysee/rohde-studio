import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { AdminProductManager } from "@/components/admin/AdminProductManager";

export const metadata: Metadata = { title: "Products", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: {
      variants: {
        orderBy: { size: "asc" },
        include: { inventory: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-8">
        <p className="label-rohde">Rohde Studio · Catalog</p>
        <h1 className="mt-2 font-display text-2xl font-bold uppercase tracking-tighter2 text-charcoal md:text-3xl">
          Products &amp; inventory
        </h1>
        <p className="mt-2 text-sm text-concrete">
          Stock changes save instantly and are audit-logged. Uploads go to the private studio storage.
        </p>
      </header>

      <AdminProductManager
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          status: p.status,
          category: p.category,
          basePrice: p.basePrice.toString(),
          currency: p.currency,
          isFeatured: p.isFeatured,
          imageCount: p.images.length,
          variants: p.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            size: v.size,
            color: v.color,
            onHand: v.inventory?.onHand ?? 0,
            reserved: v.inventory?.reserved ?? 0,
          })),
        }))}
      />
    </div>
  );
}
