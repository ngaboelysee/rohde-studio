import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { listProducts, categoryLabels } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";
import { ProductCard } from "@/components/product/ProductCard";
import { RevealText } from "@/components/motion/RevealText";

export const metadata: Metadata = pageMetadata({ title: "Catalog", path: "/products" });
export const revalidate = 60;

const CATEGORY_KEYS = [
  "OUTERWEAR",
  "KNITWEAR",
  "TOPS",
  "BOTTOMS",
  "FOOTWEAR",
  "ACCESSORIES",
] as const;

type SearchParams = { category?: string };

async function Grid({ category }: { category?: string }) {
  const { products, demo } = await listProducts({ category });

  if (products.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="heading-rohde text-2xl">This rail is empty</p>
        <p className="mt-3 text-sm text-concrete-dim">
          Nothing in this category yet — the studio is still printing.
        </p>
        <Link href="/products" className="btn-charcoal mt-8">View everything</Link>
      </div>
    );
  }

  void demo; // preview-mode is a dev concern, not a storefront element
  return (
    <>
      <div className="grid grid-cols-2 gap-x-4 gap-y-14 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              basePrice: product.basePrice,
              currency: product.currency,
              image: product.image,
              totalAvailable: product.variants.reduce((sum, v) => sum + v.available, 0),
              index: i,
            }}
          />
        ))}
      </div>
    </>
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { category } = await searchParams;
  const labels = await categoryLabels();
  const CATEGORIES = [
    { key: "", label: "All" },
    ...CATEGORY_KEYS.map((k) => ({ key: k, label: labels[k] ?? k })),
  ];

  return (
    <div className="container-rohde py-14">
      <header className="mb-10">
        <p className="label-rohde">ORBIT 001 — The catalog</p>
        <h1 className="heading-rohde mt-3 text-4xl md:text-6xl">
          <RevealText text="Every piece numbered." />
        </h1>
      </header>

      <nav
        aria-label="Category filter"
        className="mb-12 flex flex-wrap gap-x-6 gap-y-2 border-y border-charcoal/10 py-4"
      >
        {CATEGORIES.map((c) => {
          const active = (category ?? "") === c.key;
          const href = c.key ? `/products?category=${c.key}` : "/products";
          return (
            <Link
              key={c.label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`font-mono text-[10px] uppercase tracking-wider2 transition-all duration-200 ${
                active
                  ? "text-charcoal underline underline-offset-8"
                  : "text-concrete-dim hover:text-brass"
              }`}
            >
              {c.label}
            </Link>
          );
        })}
      </nav>

      <Suspense
        key={category ?? "all"}
        fallback={
          <div aria-busy="true" aria-live="polite" className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse bg-bone-deep" aria-hidden="true" />
            ))}
          </div>
        }
      >
        <Grid category={category} />
      </Suspense>
    </div>
  );
}
