import type { Metadata } from "next";
import Link from "next/link";
import { listProducts } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";
import { ProductCard } from "@/components/product/ProductCard";

export const metadata: Metadata = pageMetadata({ title: "Search", path: "/search", noIndex: true });

type SearchParams = { q?: string };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 80);

  const { products } = query ? await listProducts({ search: query, take: 24 }) : { products: [] };

  return (
    <div className="container-rohde py-14">
      <header className="mb-12">
        <p className="label-rohde">Search</p>
        <h1 className="heading-rohde mt-3 text-4xl md:text-5xl">
          {query ? <>Results for “{query}”</> : "Search the studio"}
        </h1>
      </header>

      <form action="/search" method="get" role="search" className="mb-14 max-w-xl">
        <label htmlFor="q" className="sr-only">Search the catalog</label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="hoodie, orbit, parka…"
          className="w-full border border-charcoal/25 bg-transparent px-5 py-3.5 font-mono text-sm placeholder:text-concrete transition-colors duration-300 focus:border-brass focus:outline-none focus-visible:outline-none"
        />
        <button type="submit" className="btn-charcoal mt-3">Search</button>
      </form>

      {!query ? (
        <p className="text-sm text-concrete-dim">
          Try a piece name, a drop, or a category — e.g. “puffer” or “knitwear”.
        </p>
      ) : products.length === 0 ? (
        <div className="py-16 text-center">
          <p className="heading-rohde text-2xl">No pieces found.</p>
          <p className="mt-3 text-sm text-concrete-dim">
            Try another search — or explore the full collection.
          </p>
          <Link href="/products" className="btn-charcoal mt-8">Explore the collection</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
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
      )}
    </div>
  );
}
