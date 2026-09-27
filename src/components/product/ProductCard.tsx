"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/format";
import { useWishlistStore } from "@/stores/wishlist-store";
import { trackEvent } from "@/lib/analytics/events";
import type { CatalogProduct } from "@/lib/catalog";

export type ProductCardData = Pick<
  CatalogProduct,
  "id" | "slug" | "name" | "basePrice" | "currency" | "image"
> & {
  totalAvailable: number;
  index?: number;
};

/**
 * ProductCard — editorial object, not a box. The photograph sits directly
 * on the page canvas; the only chrome is the name and price beneath it.
 * Hover: the image breathes to 1.04 and the wish list heart appears.
 * Transitions are long and quiet — the piece never shouts.
 */
export function ProductCard({ product }: { product: ProductCardData }) {
  const saved = useWishlistStore((s) => s.entries.some((e) => e.productId === product.id));
  const toggle = useWishlistStore((s) => s.toggle);
  const index = product.index ?? 0;

  function onSaveToggle() {
    const nowSaved = toggle({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      price: parseFloat(product.basePrice),
      currency: product.currency,
      addedAt: Date.now(),
    });
    if (nowSaved) {
      trackEvent("wishlist_added", { contents: [{ id: product.id, content_name: product.name }] });
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
      className="group relative"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-bone-deep">
        <Link
          href={`/products/${product.slug}`}
          aria-label={`${product.name} — view details`}
          className="absolute inset-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image}
            alt={product.name}
            loading={index < 4 ? "eager" : "lazy"}
            className="h-full w-full object-cover transition-transform duration-700 ease-luxe group-hover:scale-[1.04] group-hover:opacity-90"
          />
          {/* sold out — quiet, no colour */}
          {product.totalAvailable <= 0 ? (
            <span className="absolute bottom-4 left-4 bg-bone px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider2 text-concrete-dim">
              Sold out
            </span>
          ) : null}
        </Link>

        {/* wishlist — hairline heart, appears on hover, fills when saved */}
        <button
          type="button"
          onClick={onSaveToggle}
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          aria-pressed={saved}
          className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center transition-opacity duration-300 ${
            saved ? "opacity-100" : "opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
          }`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={saved ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.25"
            aria-hidden="true"
            className={`transition-colors duration-300 hover:text-brass ${saved ? "text-brass" : "text-charcoal"}`}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      {/* The only caption a premium piece needs — name, price. */}
      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-medium tracking-wide">
          <Link href={`/products/${product.slug}`} className="transition-colors duration-300 hover:text-brass">
            {product.name}
          </Link>
        </h3>
        <p className="font-mono text-sm text-concrete-dim">{formatPrice(product.basePrice, product.currency)}</p>
      </div>
    </motion.article>
  );
}
