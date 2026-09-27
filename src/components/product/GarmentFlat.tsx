"use client";

/**
 * GarmentStage — logo-free garment visuals on a dark showroom pedestal.
 * Real 3D: the garment rotates with the pointer (framer-motion useTilt),
 * and a slow auto-rotate runs on the hero. Multiple colorways supported.
 * The garment body is shaded with SVG gradients so rotation reads as depth.
 */
import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { GarmentKind } from "@/lib/catalog";

type Props = {
  garment: GarmentKind;
  colorway?: string;
  className?: string;
  /** Auto-rotate the garment slowly (hero usage). */
  autoRotate?: boolean;
  /** React to pointer tilt (cards). Default true. */
  interactive?: boolean;
};

/** Colorway library — rich, showroom-friendly shades. */
export const COLORWAYS = {
  Onyx: { body: "#202226", shade: "#141518", label: "Onyx" },
  Bone: { body: "#E9E6DE", shade: "#C9C5BA", label: "Bone" },
  Concrete: { body: "#8C8C8C", shade: "#6E6E6E", label: "Concrete" },
  Ember: { body: "#7A3B2E", shade: "#5C2B21", label: "Ember" },
  Moss: { body: "#4E5D4A", shade: "#3A4638", label: "Moss" },
  Cobalt: { body: "#33518F", shade: "#263D6E", label: "Cobalt" },
  Plum: { body: "#5A3D5C", shade: "#432D45", label: "Plum" },
  Sand: { body: "#C9B28C", shade: "#A8926F", label: "Sand" },
} as const;

export type ColorwayName = keyof typeof COLORWAYS;

type Colorway = (typeof COLORWAYS)[ColorwayName];

function resolveColor(colorway?: string): Colorway {
  if (colorway && colorway in COLORWAYS) {
    return COLORWAYS[colorway as ColorwayName];
  }
  // Deterministic pick from a seed string so each product keeps one color.
  const keys = Object.keys(COLORWAYS) as ColorwayName[];
  const seed = (colorway ?? "Onyx").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return COLORWAYS[keys[seed % keys.length] ?? "Onyx"];
}

/** Placement-free silhouettes in a 200×240 viewBox. */
function Silhouette({ kind, fill, shade }: { kind: GarmentKind; fill: string; shade: string }) {
  const common = { fill, stroke: "rgba(0,0,0,0.35)", strokeWidth: 1.2 } as const;

  switch (kind) {
    case "TSHIRT":
      return (
        <g>
          <path d="M70 30 L92 20 Q100 32 108 20 L130 30 L176 56 L162 94 L144 84 L148 212 Q100 224 52 212 L56 84 L38 94 L24 56 Z" {...common} />
          <path d="M92 20 Q100 32 108 20" fill="none" stroke={shade} strokeWidth="2" />
          <path d="M52 206 Q100 218 148 206" fill="none" stroke={shade} strokeWidth="1" opacity="0.6" />
        </g>
      );
    case "HOODIE":
      return (
        <g>
          <path d="M60 40 Q85 16 100 16 Q115 16 140 40 L180 62 L168 100 L148 88 L152 218 Q100 232 48 218 L52 88 L32 100 L20 62 Z" {...common} />
          <path d="M82 26 Q100 46 118 26" fill="none" stroke={shade} strokeWidth="2.5" />
          <path d="M92 210 v-34 M108 210 v-34" stroke={shade} strokeWidth="1.5" />
          <path d="M60 152 h80" stroke={shade} strokeWidth="1" opacity="0.7" />
        </g>
      );
    case "CREWNECK":
      return (
        <g>
          <path d="M68 32 L92 22 Q100 34 108 22 L132 32 L178 58 L164 96 L146 86 L150 214 Q100 226 50 214 L54 86 L36 96 L22 58 Z" {...common} />
          <path d="M92 22 Q100 34 108 22" fill="none" stroke={shade} strokeWidth="2.5" />
          <path d="M58 148 h84" stroke={shade} strokeWidth="1" opacity="0.7" />
        </g>
      );
    case "JACKET":
      return (
        <g>
          <path d="M58 38 L98 22 L100 30 L102 22 L142 38 L180 64 L166 102 L148 90 L152 220 L48 220 L52 90 L34 102 L20 64 Z" {...common} />
          <path d="M100 30 V220" stroke={shade} strokeWidth="1.5" />
          <path d="M88 58 h10 M88 74 h10" stroke={shade} strokeWidth="1" />
        </g>
      );
    case "PARKA":
      return (
        <g>
          <path d="M56 40 L98 24 L100 32 L102 24 L144 40 L182 66 L168 104 L150 92 L154 224 L46 224 L50 92 L32 104 L18 66 Z" {...common} />
          <path d="M100 32 V224" stroke={shade} strokeWidth="1.5" />
          <path d="M52 130 h96" stroke={shade} strokeWidth="1" opacity="0.6" />
        </g>
      );
    case "TROUSER":
      return (
        <g>
          <path d="M64 22 h72 l8 196 h-26 l-18 -132 -18 132 h-26 L64 22z" {...common} />
          <path d="M64 34 h72" stroke={shade} strokeWidth="1" opacity="0.7" />
        </g>
      );
    case "CAP":
      return (
        <g>
          <path d="M46 120 Q46 62 100 62 Q154 62 154 120 L154 128 L46 128 Z" {...common} />
          <path d="M154 122 Q182 128 184 142 L46 142 Q44 130 46 126" {...common} />
          <circle cx="100" cy="60" r="4" fill={shade} />
        </g>
      );
    case "SNEAKER":
      return (
        <g>
          <path d="M40 168 Q38 150 52 142 L86 120 Q104 108 122 112 Q146 118 160 136 L168 150 Q172 160 162 166 L52 176 Q42 174 40 168 Z" {...common} />
          <path d="M36 176 L172 166 Q178 176 170 182 L44 190 Q34 184 36 176 Z" fill={shade} />
          <path d="M86 122 L120 158 M100 114 L132 150" stroke={shade} strokeWidth="1.2" />
        </g>
      );
    default:
      return null;
  }
}

export function GarmentStage({
  garment,
  colorway,
  className = "",
  autoRotate = false,
  interactive = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-22, 22]), { stiffness: 120, damping: 18 });
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [14, -14]), { stiffness: 120, damping: 18 });
  const glareX = useTransform(mx, [-0.5, 0.5], ["20%", "80%"]);

  const color = resolveColor(colorway) ?? COLORWAYS.Onyx;

  function onPointerMove(e: React.PointerEvent) {
    if (!interactive || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function onPointerLeave() {
    mx.set(0);
    my.set(0);
  }

  const gid = `shade-${garment}-${color.label}`.replace(/\s/g, "");

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`perspective-1200 relative flex h-full w-full items-center justify-center ${className}`}
    >
      {/* Pedestal pool of light */}
      <div
        aria-hidden="true"
        className="absolute inset-x-[12%] bottom-[8%] h-[3px] rounded-full bg-charcoal/15 blur-[1px]"
      />
      <motion.div
        aria-hidden="true"
        className="absolute bottom-[10%] left-1/2 h-24 w-3/5 -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent_70%)]"
      />

      <motion.div
        className="preserve-3d relative"
        style={autoRotate ? { rotateY: useMotionValue(0) } : { rotateY: rotY, rotateX: rotX }}
        {...(autoRotate ? { animate: { rotateY: 360 }, transition: { duration: 46, repeat: Infinity, ease: "linear" } } : {})}
      >
        <svg viewBox="0 0 200 240" className="h-[82%] max-h-full w-auto drop-shadow-[0_18px_28px_rgba(0,0,0,0.5)]">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color.body} />
              <stop offset="100%" stopColor={color.shade} />
            </linearGradient>
          </defs>
          {/* fill via url(#gid) — pass through Silhouette by wrapping */}
          <Silhouette kind={garment} fill={`url(#${gid})`} shade={color.shade} />
        </svg>

        {/* Moving glare — sells the 3D */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_60%)]"
          style={{ left: glareX, width: "40%", filter: "blur(8px)" }}
        />
      </motion.div>

      {/* Colorway label */}
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 font-mono text-[9px] uppercase tracking-wider2 text-concrete-dim">
        {color.label}
      </span>
    </div>
  );
}
