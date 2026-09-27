import Link from "next/link";
import { OrbitLogo } from "@/components/brand/OrbitLogo";

/**
 * Footer — concise and useful, not a second webpage.
 * Navigation · contact · social · legal. Story content lives on /about.
 */
export function Footer() {
  return (
    <footer className="accent-brass mt-24 border-t border-charcoal/10 bg-bone">
      <div className="container-rohde py-14">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 text-charcoal transition-colors duration-300 hover:text-brass">
              <OrbitLogo size={40} />
              <span className="font-display text-lg font-bold uppercase tracking-[0.3em]">Rohde</span>
            </div>
            <p className="label-rohde mt-5 max-w-xs leading-loose">
              Custom digital printing atelier.<br />
              Kigali, Rwanda — printed to order,<br />
              shipped worldwide.
            </p>
          </div>

          {/* Site */}
          <nav aria-label="Footer">
            <h3 className="label-rohde">Explore</h3>
            <ul className="mt-5 space-y-3 text-sm">
              {[
                { href: "/", label: "Home" },
                { href: "/products", label: "Shop" },
                { href: "/about", label: "About" },
                { href: "/wishlist", label: "Wishlist" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-concrete-dim transition-colors duration-300 hover:text-brass">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h3 className="label-rohde">Contact</h3>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <a
                  href="https://wa.me/250781214230"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-concrete-dim transition-colors duration-300 hover:text-brass"
                >
                  WhatsApp — +250 781 214 230
                </a>
              </li>
              <li>
                <a
                  href="mailto:rakininkubito@gmail.com"
                  className="text-concrete-dim transition-colors duration-300 hover:text-brass"
                >
                  rakininkubito@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com/rohdestudioo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-concrete-dim transition-colors duration-300 hover:text-brass"
                >
                  @rohdestudioo
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal line */}
        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-charcoal/10 pt-6 font-mono text-[10px] uppercase tracking-wider2 text-concrete-dim md:flex-row">
          <p>© {new Date().getFullYear()} Rohde Studio — Kigali · Rwanda</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="transition-colors duration-300 hover:text-brass">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors duration-300 hover:text-brass">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
