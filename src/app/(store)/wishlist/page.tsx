"use client";

import Link from "next/link";
import { useWishlistStore } from "@/stores/wishlist-store";
import { formatPrice } from "@/lib/format";
import { OrbitLogo } from "@/components/brand/OrbitLogo";

export default function WishlistPage() {
  const entries = useWishlistStore((s) => s.entries);
  const toggle = useWishlistStore((s) => s.toggle);

  return (
    <div className="container-rohde py-14">
      <header className="mb-12">
        <p className="label-rohde">Saved pieces</p>
        <h1 className="heading-rohde mt-3 text-4xl md:text-5xl">Wishlist</h1>
      </header>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <h2 className="heading-rohde text-2xl">Nothing saved yet.</h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-concrete-dim">
            Save pieces while you browse — they will wait for you here, on this device.
          </p>
          <Link href="/products" className="btn-charcoal mt-8">Explore the collection</Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-5 gap-y-14 md:grid-cols-3 lg:grid-cols-4">
          {entries.map((entry) => (
            <li key={entry.productId} className="group relative">
              <Link
                href={`/products/${entry.slug}`}
                aria-label={`${entry.name} — view details`}
                className="block aspect-[4/5] overflow-hidden bg-bone-deep"
              >
                {entry.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.image}
                    alt={entry.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-all duration-700 ease-luxe group-hover:scale-[1.04] group-hover:opacity-90"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-charcoal/25">
                    <OrbitLogo size={56} />
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={() =>
                  toggle({
                    productId: entry.productId,
                    slug: entry.slug,
                    name: entry.name,
                    image: entry.image,
                    price: entry.price,
                    currency: entry.currency,
                    addedAt: entry.addedAt,
                  })
                }
                aria-label={`Remove ${entry.name} from wishlist`}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center opacity-0 transition-opacity duration-300 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  aria-hidden="true"
                  className="text-charcoal"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
              <div className="mt-4 flex items-baseline justify-between gap-4">
                <h2 className="text-sm font-medium tracking-wide">
                  <Link href={`/products/${entry.slug}`} className="transition-opacity duration-300 hover:opacity-60">
                    {entry.name}
                  </Link>
                </h2>
                <p className="font-mono text-sm text-concrete-dim">{formatPrice(entry.price, entry.currency)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
