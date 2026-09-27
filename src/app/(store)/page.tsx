import Link from "next/link";
import { listProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/product/ProductCard";
import { GlowWatermark } from "@/components/brand/GlowWatermark";
import { AnimatedWordmark } from "@/components/motion/AnimatedWordmark";
import { RevealText } from "@/components/motion/RevealText";
import { FadeIn } from "@/components/motion/FadeIn";

export const revalidate = 120;

/**
 * Home — three movements, nothing else.
 * 1 · Hero — the brand, the wordmark, one CTA.
 * 2 · Featured collection — the pieces, the photography, one path to Shop.
 * 3 · About preview — curiosity only; the story lives on /about.
 */
export default async function HomePage() {
  const { products: featured } = await listProducts({ featuredOnly: true, take: 4 });
  const rest = featured.slice(0, 4);

  return (
    <>
      {/* ─── 1 · Hero — brand introduction ───────────────────────────── */}
      <section aria-label="Rohde — introduction" className="relative -mt-16 md:-mt-20">
        <div className="skeuo-grain relative flex min-h-[92vh] w-full items-start justify-center overflow-hidden">
          {/* Watermark — absolute wrapper so the mark sits dead-center;
              the wordmark below rides directly on top of it, no gap.
              Scaled down on small screens so the mark stays visible. */}
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <GlowWatermark className="scale-[0.42] sm:scale-[0.6] md:scale-100" />
          </div>

          {/* Brand block — wordmark with its wording flowing directly
              beneath it in the same column; overlap is structurally
              impossible, and the hard pt keeps clear of the navbar */}
          <div className="container-rohde relative pb-20 pt-40 md:pt-52">
            <div className="font-display text-[19vw] leading-[0.95] md:text-[14vw]">
              <AnimatedWordmark text="ROHDE" />
            </div>
            <div className="mt-8 flex flex-col items-start gap-6 text-left">
              <FadeIn delay={0.1}>
                <p className="label-rohde">Custom digital printing atelier — Kigali</p>
              </FadeIn>
              <FadeIn delay={0.55}>
                <p className="max-w-md text-sm leading-loose text-concrete-dim">
                  Heavyweight blanks. Numbered pieces. Printed to order in-studio —
                  when a run is gone, it is gone.
                </p>
              </FadeIn>
              <FadeIn delay={0.7}>
                <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                  <Link href="/products" className="btn-charcoal">
                    Shop the collection
                  </Link>
                  <Link href="/about" className="link-brass text-sm text-concrete-dim">
                    Our story
                  </Link>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2 · Featured collection ─────────────────────────────────── */}
      <section aria-labelledby="collection-heading" className="container-rohde py-24 md:py-36">
        <FadeIn>
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="label-rohde">ORBIT 001 — the current run</p>
              <h2 id="collection-heading" className="heading-rohde mt-3 text-3xl md:text-4xl">
                New collection
              </h2>
            </div>
            <Link href="/products" className="link-brass shrink-0 text-sm text-concrete-dim">
              Explore the collection
            </Link>
          </div>
        </FadeIn>

        <div className="grid grid-cols-2 gap-x-5 gap-y-14 md:grid-cols-4">
          {rest.map((product, i) => (
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
      </section>

      {/* ─── 3 · About preview — curiosity, not the whole story ──────── */}
      <section aria-labelledby="about-heading" className="container-rohde py-24 md:py-32">
        <div className="grid gap-10 border-t border-charcoal/10 pt-20 md:grid-cols-2 md:gap-20 md:pt-28">
          <FadeIn>
            <p className="label-rohde">The studio</p>
            <h2 id="about-heading" className="heading-rohde mt-4 max-w-md text-3xl leading-[1.05] md:text-4xl">
              <RevealText text="Objects of orbit — cut for the dark, printed to order." />
            </h2>
          </FadeIn>
          <FadeIn delay={0.15} className="flex flex-col justify-end">
            <p className="max-w-md text-sm leading-loose text-concrete-dim">
              Rohde is a digital printing atelier in Kigali. Heavyweight cottons,
              restrained palettes, numbered runs — a studio practice applied to
              garments, one piece at a time.
            </p>
            <div className="mt-8">
              <Link href="/about" className="link-brass text-sm text-charcoal">
                Discover our story →
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
