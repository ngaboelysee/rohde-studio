import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Quiet luxury: black-and-white system (BLACK CANVAS) ─────
        // "bone" = canvas, "charcoal" = ink (legacy semantic names kept
        // so existing markup reads correctly after the restore).
        bone: "#0B0B0B", // charcoal-black canvas — the flagship look
        "bone-deep": "#050505", // recessed / alt surface
        "bone-raised": "#141414", // raised hover surface
        charcoal: "#FBFBFB", // off-white — primary ink on black
        offwhite: "#0B0B0B", // ink on light buttons
        void: "#FBFBFB", // light solid — buttons, statement sections
        canvas: "#0B0B0B",
        concrete: "#8C8C8C", // raw concrete — mid grey
        "concrete-dim": "#8C8C8C", // label grey

        // Kept for compile-safety of old classnames.
        volt: "#FBFBFB",
        "volt-dim": "#8C8C8C",
        steel: "#8C8C8C",
        ash: "#8C8C8C",
        "bone-warm": "#0B0B0B",

        // ── Accent system (ui-ux-pro-max: "E-commerce Luxury — premium
        // dark + gold accent"). One quiet brass for hovers/focus; a deeper
        // tone for hovers on light (void) surfaces. Monochrome stays king —
        // brass only appears on interaction.
        brass: "#C9A962", // interaction accent on black — AAA on #0B0B0B
        "brass-deep": "#A16207", // interaction accent on light surfaces

        error: "#B3261E",
        success: "#1E6B45",
      },
      fontFamily: {
        // Display = Unbounded reserved for the wordmark and rare statements;
        // everything else Manrope. Two weights each, restrained sizes.
        sans: ['"Manrope"', '"Google Sans"', "Arial", "system-ui", "sans-serif"],
        body: ['"Manrope"', '"Google Sans"', "Arial", "system-ui", "sans-serif"],
        display: ['"Unbounded"', '"Manrope"', "Arial", "sans-serif"],
        mono: ["ui-monospace", '"SF Mono"', '"Cascadia Mono"', "Menlo", "Consolas", "monospace"],
      },
      letterSpacing: {
        wider2: "0.18em",
        tighter2: "-0.02em",
      },
      boxShadow: {
        // Flat system: hairlines instead of shadows. One soft elevation
        // reserved for the cart drawer only.
        glow: "0 0 0 1px rgba(251,251,251,0.1)",
        "glow-hover": "0 24px 60px rgba(0,0,0,0.6)",
        none: "none",
      },
      transitionTimingFunction: {
        luxe: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
