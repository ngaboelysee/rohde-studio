import { COLORWAYS } from "@/components/product/GarmentFlat";
import type { ColorwayName } from "@/components/product/GarmentFlat";
import { OrbitLogo } from "@/components/brand/OrbitLogo";

/**
 * Fabric layer — maps studio colorways onto real garment photography via CSS
 * filters (so one blank photo can present as several fabric colors, like a
 * true colorway set) and derives print ink by luminance so the logo always
 * contrasts with the cloth.
 */

export type Fabric = {
  /** Display name shown on swatches. */
  label: string;
  /** Hex chip for swatches / catalog display. */
  hex: string;
  /** CSS filter chain that turns a blank photo into this fabric color. */
  filter: string;
  /** Approximate relative luminance 0–1, used to pick print ink. */
  luminance: number;
};

/** Core fabric set — neutral trio plus accent shades. */
export const FABRICS: Record<ColorwayName, Fabric> = {
  Onyx:     { label: "Onyx Black",    hex: "#202226", filter: "grayscale(1) brightness(0.34) contrast(1.18)", luminance: 0.06 },
  Bone:     { label: "Raw White",     hex: "#E9E6DE", filter: "grayscale(1) brightness(1.14) contrast(0.94) sepia(0.07)", luminance: 0.82 },
  Concrete: { label: "Concrete Grey", hex: "#8C8C8C", filter: "grayscale(1) brightness(0.72) contrast(1.02)",  luminance: 0.32 },
  Ember:    { label: "Ember Rust",    hex: "#7A3B2E", filter: "sepia(0.65) saturate(2.1) hue-rotate(-18deg) brightness(0.62)", luminance: 0.14 },
  Moss:     { label: "Moss Green",    hex: "#4E5D4A", filter: "sepia(0.5) saturate(1.4) hue-rotate(50deg) brightness(0.6)", luminance: 0.12 },
  Cobalt:   { label: "Cobalt Blue",   hex: "#33518F", filter: "sepia(0.6) saturate(2.4) hue-rotate(185deg) brightness(0.62)", luminance: 0.11 },
  Plum:     { label: "Plum Purple",   hex: "#5A3D5C", filter: "sepia(0.55) saturate(1.9) hue-rotate(250deg) brightness(0.58)", luminance: 0.1 },
  Sand:     { label: "Sand",          hex: "#C9B28C", filter: "sepia(0.45) saturate(1.15) brightness(1.02)", luminance: 0.55 },
};

export type FabricName = keyof typeof FABRICS;

/** Ordered set for the catalog — neutrals first, accents after. */
export const FABRIC_ORDER: FabricName[] = [
  "Bone",
  "Onyx",
  "Concrete",
  "Sand",
  "Ember",
  "Moss",
  "Cobalt",
  "Plum",
];

/**
 * Legacy colorway strings ("Onyx", "Bone", … or arbitrary demo ids) map onto
 * the fabric library; unknown seeds fall back to Onyx so every product keeps
 * a stable pick.
 */
export function fabricFor(colorway: string): Fabric {
  if (colorway in FABRICS) return FABRICS[colorway as FabricName];
  const keys = Object.keys(FABRICS) as FabricName[];
  const seed = colorway.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return FABRICS[keys[seed % keys.length] ?? "Onyx"];
}

/** Print ink options for the customizer. */
export const PRINT_INKS = {
  auto:     { label: "Auto contrast", hex: "auto" },
  white:    { label: "White",         hex: "#FBFBFB" },
  black:    { label: "Black",         hex: "#141414" },
  volt:     { label: "Volt",          hex: "#BFFF2E" },
  concrete: { label: "Concrete",      hex: "#8C8C8C" },
} as const;

export type PrintInkName = keyof typeof PRINT_INKS;

/**
 * Resolve the final print ink. "auto" picks black or white by fabric
 * luminance — dark cloth gets light ink, light cloth gets dark ink.
 */
export function resolveInk(ink: PrintInkName, fabric: Fabric): string {
  if (ink !== "auto") return PRINT_INKS[ink].hex;
  return fabric.luminance >= 0.45 ? "#1A1A1A" : "#FBFBFB";
}

/** The real Rohde lockup, parameterized for print — reused by every print surface. */
export function OrbitMark({ ink, className }: { ink: string; className?: string }) {
  // White-filled letters (like the source art) when printing in light ink on
  // dark cloth; hollow outline when printing dark ink on light cloth.
  const letterFill = ink === "#FBFBFB" ? "#FBFBFB" : "none";
  return <OrbitLogo ink={ink} letterFill={letterFill} className={className} />;
}

/** Placement presets — where the mark sits on the garment photo. */
export const PLACEMENTS = {
  chest:  { label: "Left chest", style: { top: "26%", left: "30%" }, size: 0.13 },
  center: { label: "Center chest", style: { top: "40%", left: "50%" }, size: 0.26 },
  back:   { label: "Full back", style: { top: "42%", left: "50%" }, size: 0.5 },
} as const;

export type PlacementName = keyof typeof PLACEMENTS;

/** Where each product's fabric colorway lives in its photo set. */
export function fabricPhoto(photos: Partial<Record<FabricName, string>>, fabric: FabricName, fallback: string): string {
  return photos[fabric] ?? fallback;
}
