"use client";

/**
 * GarmentMockup — a real blank garment photo, recolored to a fabric via CSS
 * filters, with the atelier mark applied as a positioned print overlay. On
 * dark fabrics the mark prints in white with a screen blend (reads as a real
 * DTG print on black cotton); on light fabrics, dark ink normal-blended.
 */
import { OrbitMark, resolveInk } from "@/lib/fabric";
import type { Fabric, PrintInkName } from "@/lib/fabric";

type Placement = "chest" | "center" | "back";

/** Where the print sits on the photo frame, and how wide it renders. Wide 2.5:1 lockup. */
const PLACEMENTS: Record<Placement, { top: string; left: string; size: number }> = {
  chest: { top: "30%", left: "40%", size: 0.34 },
  center: { top: "44%", left: "50%", size: 0.52 },
  back: { top: "46%", left: "50%", size: 0.72 },
};

type Props = {
  /** Verified blank photo URL. */
  photo: string;
  fabric: Fabric;
  placement?: Placement;
  /** Print width relative to image width (0–1). Overrides placement default. */
  scale?: number;
  /** Print ink — "auto" derives from fabric luminance. */
  ink?: PrintInkName;
  /** Render the print overlay at all (false = clean blank garment). */
  print?: boolean;
  /** Optional wordmark printed under the mark (scales with the print). */
  caption?: string;
  className?: string;
  alt?: string;
};

export function GarmentMockup({
  photo,
  fabric,
  placement = "chest",
  scale,
  ink = "auto",
  print = true,
  caption,
  className = "",
  alt = "Garment mockup",
}: Props) {
  const finalInk = resolveInk(ink, fabric);
  const dark = fabric.luminance < 0.45;
  const pos = PLACEMENTS[placement];
  const width = `${(scale ?? pos.size) * 100}%`;

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      {/* Fabric — real photo recolored by the fabric filter */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ filter: fabric.filter }}
        draggable={false}
      />
      {/* Fabric grain — keeps the recolor photo-real */}
      <div
        aria-hidden="true"
        className="skeuo-grain pointer-events-none absolute inset-0 opacity-60 mix-blend-overlay"
      />

      {/* Print — pinned to the garment grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          display: print ? undefined : "none",
          top: pos.top,
          left: pos.left,
          width,
          transform: "translate(-50%, -50%)",
          mixBlendMode: dark ? "screen" : "normal",
          opacity: dark ? 0.96 : 0.92,
        }}
      >
        <OrbitMark
          ink={finalInk}
          className="h-auto w-full drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]"
        />
        {caption ? (
          <svg viewBox="0 0 140 18" className="mt-[7%] w-full" aria-hidden="true">
            <text
              x="70"
              y="13"
              textAnchor="middle"
              fill={finalInk}
              fontSize="11"
              letterSpacing="6"
              fontFamily="'Unbounded', 'Google Sans', Arial, sans-serif"
            >
              {caption}
            </text>
          </svg>
        ) : null}
      </div>
    </div>
  );
}
