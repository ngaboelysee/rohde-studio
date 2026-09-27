import { OrbitLogo } from "@/components/brand/OrbitLogo";

/**
 * Floating WhatsApp Business contact — persistent on every page so buyers
 * can message the seller directly. Pulsing live indicator; accessible label.
 */
export function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/250781214230?text=Hi%20Rohde%20—%20I%27d%20like%20to%20order%20a%20piece"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Rohde on WhatsApp Business"
      className="group fixed bottom-20 right-5 z-40 flex items-center gap-3 border border-charcoal/15 bg-bone py-2.5 pl-3 pr-4 shadow-glow transition-all duration-300 ease-luxe hover:border-brass/50 md:bottom-6"
    >
      <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
      </span>
      <span className="font-mono text-[10px] uppercase tracking-wider2 text-charcoal transition-colors duration-300 group-hover:text-brass">
        Order via WhatsApp
      </span>
      <OrbitLogo size={16} className="text-concrete-dim transition-colors duration-300 group-hover:text-brass" />
    </a>
  );
}
