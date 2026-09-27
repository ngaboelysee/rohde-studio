"use client";

/**
 * Header — Liquid Glass island with docking behavior (desktop).
 *
 * Top of page: full horizontal island, as delivered.
 * Past the hero (~60vh): the island glides toward the right edge while
 * folding away, and a slim vertical glass rail docks on the right — logo,
 * bag count, dot-links, wishlist. Hovering or tapping the rail unfolds the
 * full bar again, links cascading in with a staggered delay.
 * Mobile keeps the classic island + full-screen glass menu.
 * Reduced motion: states swap without the glide.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { OrbitLogo } from "@/components/brand/OrbitLogo";
import { useCartStore } from "@/stores/cart-store";
import { useWishlistStore } from "@/stores/wishlist-store";

const EASE = [0.16, 1, 0.3, 1] as const;

const NAV = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Shop" },
  { href: "/about", label: "About" },
];

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const on = () => setMatches(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return matches;
}

export function Header() {
  const pathname = usePathname();
  const openCart = useCartStore((s) => s.open);
  const cartCount = useCartStore((s) => s.lines.reduce((n, l) => n + l.quantity, 0));
  const wishlistCount = useWishlistStore((s) => s.entries.length);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [unfolded, setUnfolded] = useState(false); // rail hover/click
  const [menuOpen, setMenuOpen] = useState(false);
  const islandRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isDesktop = useMediaQuery("(min-width: 768px)");

  useEffect(() => setMounted(true), []);
  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Dock after the hero settles — desktop only.
  useEffect(() => {
    const onScroll = () => setScrolled(isDesktop && window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isDesktop]);

  const docked = scrolled && !unfolded && !menuOpen;

  return (
    <>
      {/* ── Full island (top state + unfolded state) ──────────────────── */}
      <motion.header
        initial={false}
        animate={{
          x: docked ? 160 : 0,
          y: docked ? 8 : 0,
          opacity: docked ? 0 : 1,
        }}
        transition={{ duration: reduceMotion ? 0 : 0.55, ease: EASE }}
        className={`fixed inset-x-3 top-3 z-40 md:inset-x-5 md:top-4 ${
          docked ? "pointer-events-none" : "pointer-events-auto"
        }`}
        onMouseLeave={() => setUnfolded(false)}
      >
        <div ref={islandRef} className="container-rohde">
          <div className={`liquid-glass transition-all duration-500 ease-luxe ${scrolled ? "is-scrolled" : ""}`}>
            <div className={`flex items-center justify-between px-4 md:px-7 ${scrolled ? "h-14" : "h-16"}`}>
              <Link
                href="/"
                aria-label="Rohde — home"
                className="flex items-center gap-2.5 text-charcoal transition-colors duration-300 hover:text-brass"
              >
                <OrbitLogo size={30} />
                <span className="hidden font-display text-sm font-bold uppercase tracking-[0.32em] sm:block">
                  Rohde
                </span>
              </Link>

              {/* Center — links cascade when the island unfolds */}
              <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
                {NAV.map((item, i) => {
                  const active = pathname === item.href.split("?")[0];
                  return (
                    <motion.div
                      key={item.label}
                      initial={false}
                      animate={{ opacity: docked ? 0 : 1, y: docked ? 10 : 0 }}
                      transition={{
                        duration: reduceMotion ? 0 : 0.45,
                        ease: EASE,
                        delay: docked ? 0 : 0.12 + i * 0.07,
                      }}
                    >
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`link-brass text-[13px] tracking-wide ${
                          active ? "text-charcoal" : "text-concrete-dim"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>

              <div className="flex items-center gap-6 text-charcoal">
                <Link href="/search" aria-label="Search" className="link-brass hidden text-[13px] tracking-wide sm:block">
                  Search
                </Link>
                <Link
                  href="/wishlist"
                  aria-label={`Wishlist, ${wishlistCount} items`}
                  className="link-brass hidden text-[13px] tracking-wide sm:block"
                >
                  Saved{mounted && wishlistCount > 0 ? ` (${wishlistCount})` : ""}
                </Link>
                <button
                  type="button"
                  onClick={openCart}
                  aria-label={`Open bag, ${cartCount} items`}
                  className="link-brass text-[13px] tracking-wide"
                >
                  Bag{mounted && cartCount > 0 ? ` (${cartCount})` : ""}
                </button>
                {/* Mobile burger — two hairlines, stills to an × */}
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  aria-controls="mobile-menu"
                  aria-label={menuOpen ? "Close menu" : "Open menu"}
                  className="flex h-10 w-10 items-center justify-center transition-colors duration-300 hover:text-brass md:hidden"
                >
                  <svg width="20" height="12" viewBox="0 0 20 12" fill="none" aria-hidden="true">
                    {menuOpen ? (
                      <path d="M1 1l18 10M19 1L1 11" stroke="currentColor" strokeWidth="1.25" />
                    ) : (
                      <path d="M0 1h20M0 8h14" stroke="currentColor" strokeWidth="1.25" />
                    )}
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* ── Docked rail (desktop, right edge) ─────────────────────────── */}
      <AnimatePresence>
        {docked ? (
          <motion.aside
            key="rail"
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 28 }}
            transition={{ duration: reduceMotion ? 0 : 0.45, ease: EASE, delay: 0.3 }}
            className="liquid-glass fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center px-2 py-4 md:flex"
            onMouseEnter={() => setUnfolded(true)}
            onClick={() => setUnfolded(true)}
          >
            <Link
              href="/"
              aria-label="Rohde — home"
              className="mb-2 text-charcoal transition-colors duration-300 hover:text-brass"
            >
              <OrbitLogo size={22} />
            </Link>
            <button
              type="button"
              onClick={openCart}
              aria-label={`Open bag, ${cartCount} items`}
              className="relative flex h-9 w-9 items-center justify-center font-mono text-[9px] uppercase text-charcoal transition-colors duration-300 hover:text-brass"
            >
              Bag
              {mounted && cartCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-void font-mono text-[7px] text-offwhite">
                  {cartCount}
                </span>
              ) : null}
            </button>
            <div className="my-2 h-px w-5 bg-charcoal/15" aria-hidden="true" />
            {NAV.filter((item) => item.href !== "/").map((item) => (
              <Link
                key={item.label}
                href={item.href}
                aria-label={item.label}
                title={item.label}
                className="group flex h-9 w-9 items-center justify-center"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-concrete/40 transition-all duration-300 group-hover:scale-150 group-hover:bg-brass" />
              </Link>
            ))}
            <div className="my-2 h-px w-5 bg-charcoal/15" aria-hidden="true" />
            <Link
              href="/wishlist"
              aria-label={`Wishlist, ${wishlistCount} items`}
              className="flex h-9 w-9 items-center justify-center text-sm text-charcoal transition-colors duration-300 hover:text-brass"
            >
              ♥
            </Link>
            <p className="label-rohde mt-2 !text-[8px]">Unfold</p>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      {/* ── Mobile menu — full-screen glass sheet, oversized type ─────── */}
      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="glass-nav fixed inset-0 top-0 z-30 flex flex-col md:hidden"
          >
            <div className="h-20" aria-hidden="true" />
            <nav aria-label="Mobile" className="container-rohde flex-1 pt-10">
              <ul className="space-y-2">
                {NAV.map((item, i) => (
                  <li key={item.label}>
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.08 + i * 0.06, ease: EASE }}
                    >
                      <Link
                        href={item.href}
                        className="link-brass heading-rohde block py-3 text-4xl text-charcoal"
                        onClick={() => setMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                      <div className="h-px w-full bg-charcoal/10" aria-hidden="true" />
                    </motion.div>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="container-rohde flex items-center justify-between pb-10 pt-6 text-[13px]">
              <Link href="/search" className="link-brass text-concrete-dim" onClick={() => setMenuOpen(false)}>
                Search
              </Link>
              <Link href="/wishlist" className="link-brass text-concrete-dim" onClick={() => setMenuOpen(false)}>
                Saved ({wishlistCount})
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  openCart();
                }}
                className="link-brass text-concrete-dim"
              >
                Bag ({cartCount})
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
