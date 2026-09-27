import Link from "next/link";
import { OrbitLogo } from "@/components/brand/OrbitLogo";
import { FadeIn } from "@/components/motion/FadeIn";
import { RevealText } from "@/components/motion/RevealText";

export const metadata = {
  title: "About",
  description:
    "Rohde is a digital printing atelier in Kigali — heavyweight blanks, numbered runs, printed to order.",
};

/**
 * About — the editorial record of the studio. Everything informational that
 * left the Home page lives here, in short readable movements.
 */
export default function AboutPage() {
  return (
    <article className="container-rohde pb-28 pt-16 md:pt-24">
      {/* ─── Opening statement ───────────────────────────────────────── */}
      <header className="max-w-3xl">
        <FadeIn>
          <p className="label-rohde">The studio</p>
        </FadeIn>
        <h1 className="heading-rohde mt-4 text-4xl leading-[1.05] md:text-6xl">
          <RevealText text="Printed in Kigali, worn everywhere." />
        </h1>
        <FadeIn delay={0.25}>
          <p className="mt-8 max-w-xl text-sm leading-loose text-concrete-dim">
            Rohde is a digital printing atelier and luxury fashion house.
            Heavyweight blanks, restrained palettes, numbered runs — a studio
            practice applied to garments, one piece at a time.
          </p>
        </FadeIn>
      </header>

      {/* ─── The story ───────────────────────────────────────────────── */}
      <section aria-labelledby="story-heading" className="mt-20 grid gap-10 border-t border-charcoal/10 pt-16 md:mt-28 md:grid-cols-2 md:gap-20">
        <FadeIn>
          <p className="label-rohde">01 — Story</p>
          <h2 id="story-heading" className="heading-rohde mt-4 text-2xl md:text-3xl">
            Born of print
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="max-w-md space-y-5 text-sm leading-loose text-concrete-dim">
            <p>
              Rohde began at the printer, not the drawing board. The studio's
              first pieces were heavyweight blanks chosen the way a gallery
              chooses canvas — for weight, for drape, for the way ink sits on
              the surface.
            </p>
            <p>
              Every drop is a numbered run. Every piece is printed to order,
              in-studio, the moment it is asked for. Nothing is warehoused,
              nothing is remade. When a run is gone, it is gone.
            </p>
          </div>
        </FadeIn>
      </section>

      {/* ─── Philosophy ──────────────────────────────────────────────── */}
      <section aria-labelledby="philosophy-heading" className="mt-20 grid gap-10 border-t border-charcoal/10 pt-16 md:mt-28 md:grid-cols-2 md:gap-20">
        <FadeIn>
          <p className="label-rohde">02 — Philosophy</p>
          <h2 id="philosophy-heading" className="heading-rohde mt-4 text-2xl md:text-3xl">
            Restraint is the statement
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="max-w-md space-y-5 text-sm leading-loose text-concrete-dim">
            <p>
              Monochrome is not an absence — it is discipline. The palette
              holds to charcoal, off-white and raw concrete so the cut, the
              weight and the print can speak without competition.
            </p>
            <p>
              The studio releases slowly, in small numbers, and treats every
              garment as a numbered edition rather than inventory.
            </p>
          </div>
        </FadeIn>
      </section>

      {/* ─── Craft ───────────────────────────────────────────────────── */}
      <section aria-labelledby="craft-heading" className="mt-20 grid gap-10 border-t border-charcoal/10 pt-16 md:mt-28 md:grid-cols-2 md:gap-20">
        <FadeIn>
          <p className="label-rohde">03 — Craft</p>
          <h2 id="craft-heading" className="heading-rohde mt-4 text-2xl md:text-3xl">
            Heavyweight, by principle
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="max-w-md space-y-5 text-sm leading-loose text-concrete-dim">
            <p>
              240 to 480gsm cottons. Boxy cuts. Ribbed trims, double-lined
              hoods, tubular bodies. The blanks are selected for structure
              first, then printed with water-based inks in-studio.
            </p>
            <p>
              Custom prints are applied to order — each piece stays one-of-one.
            </p>
          </div>
        </FadeIn>
      </section>

      {/* ─── Vision ──────────────────────────────────────────────────── */}
      <section aria-labelledby="vision-heading" className="mt-20 border-t border-charcoal/10 pt-16 md:mt-28">
        <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
          <FadeIn className="max-w-xl">
            <p className="label-rohde">04 — Vision</p>
            <h2 id="vision-heading" className="heading-rohde mt-4 text-2xl md:text-3xl">
              A wardrobe of numbered objects
            </h2>
            <p className="mt-6 max-w-md text-sm leading-loose text-concrete-dim">
              Fewer pieces, held longer. The studio's measure of success is a
              garment worn for years, not units moved in a season.
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <OrbitLogo size={72} className="text-concrete/40" />
          </FadeIn>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────────── */}
      <section className="mt-24 border-t border-charcoal/10 pt-16 text-center md:mt-32">
        <FadeIn>
          <p className="font-body text-2xl font-light leading-snug tracking-tighter2 md:text-3xl">
            See what the studio is making now.
          </p>
          <div className="mt-10">
            <Link href="/products" className="btn-charcoal">
              Explore the collection
            </Link>
          </div>
        </FadeIn>
      </section>
    </article>
  );
}
