"use client";

/**
 * Customizer — print-studio window. The shopper previews the atelier mark on
 * a real blank garment photo: fabric, placement, scale and ink, all live.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GarmentMockup } from "@/components/product/GarmentMockup";
import { FABRICS, FABRIC_ORDER, PRINT_INKS, resolveInk } from "@/lib/fabric";
import type { FabricName, PrintInkName } from "@/lib/fabric";

type Placement = "chest" | "center" | "back";

export type CustomSpec = {
  fabric: FabricName;
  placement: Placement;
  /** Print width relative to the photo width (0.06–0.7). */
  scale: number;
  ink: PrintInkName;
};

export type CustomizerData = {
  spec: CustomSpec;
  /** Verified blank photo for the current garment. */
  photo: string;
};

const PLACEMENT_LABELS: Record<Placement, string> = {
  chest: "Left chest",
  center: "Center chest",
  back: "Full back",
};

export function Customizer({
  open,
  onClose,
  photo,
  initialFabric,
  onApply,
}: {
  open: "closed" | "customize";
  onClose: () => void;
  photo: string;
  initialFabric: FabricName;
  onApply: (spec: CustomSpec) => void;
}) {
  const [spec, setSpec] = useState<CustomSpec>({
    fabric: initialFabric,
    placement: "center",
    scale: 0.52,
    ink: "auto",
  });

  // Re-sync fabric when the shopper changes the product colorway.
  useEffect(() => {
    setSpec((s) => (s.fabric === initialFabric ? s : { ...s, fabric: initialFabric }));
  }, [initialFabric]);

  const fabric = FABRICS[spec.fabric];
  const ink = resolveInk(spec.ink, fabric);

  return (
    <AnimatePresence>
      {open === "customize" ? (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-label="Print studio customizer"
        >
          {/* Scrim */}
          <button
            type="button"
            aria-label="Close customizer"
            onClick={onClose}
            className="absolute inset-0 bg-canvas/80 backdrop-blur-sm"
          />

          <motion.div
            className="skeuo-card relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden bg-bone shadow-glow"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-charcoal/10 px-5 py-4">
              <div>
                <p className="label-rohde">Print studio</p>
                <h2 className="text-base font-medium uppercase tracking-[0.14em]">
                  Customize your piece
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="skeuo-bar flex h-9 w-9 items-center justify-center text-sm text-concrete-dim transition-colors duration-300 hover:text-brass"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-[1.2fr_1fr]">
              {/* Preview */}
              <div className="skeuo-well relative min-h-[320px] border-b border-charcoal/10 md:min-h-full md:border-b-0 md:border-r">
                <GarmentMockup
                  photo={photo}
                  fabric={fabric}
                  placement={spec.placement}
                  scale={spec.scale}
                  ink={spec.ink}
                  caption={spec.placement === "back" ? "ROHDE" : undefined}
                />
                <span className="absolute left-4 top-4 font-mono text-[9px] uppercase tracking-wider2 text-concrete-dim">
                  Live preview
                </span>
                <span className="absolute bottom-4 right-4 font-mono text-[9px] uppercase tracking-wider2 text-concrete-dim">
                  {PLACEMENT_LABELS[spec.placement]} · {PRINT_INKS[spec.ink].label} ink
                </span>
              </div>

              {/* Controls */}
              <div className="min-h-0 overflow-y-auto px-5 py-5">
                {/* Fabric */}
                <fieldset>
                  <legend className="label-rohde">Fabric</legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {FABRIC_ORDER.map((name) => {
                      const active = spec.fabric === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          aria-pressed={active}
                          aria-label={FABRICS[name].label}
                          onClick={() => setSpec((s) => ({ ...s, fabric: name }))}
                          className={`h-8 w-8 rounded-full border-2 transition-all duration-200 ${
                            active ? "scale-110 border-charcoal" : "border-charcoal/20 hover:border-brass"
                          }`}
                          style={{ backgroundColor: FABRICS[name].hex }}
                        />
                      );
                    })}
                  </div>
                </fieldset>

                {/* Placement */}
                <fieldset className="mt-6">
                  <legend className="label-rohde">Placement</legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(Object.keys(PLACEMENT_LABELS) as Placement[]).map((p) => {
                      const active = spec.placement === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSpec((s) => ({ ...s, placement: p, scale: p === "back" ? 0.72 : p === "center" ? 0.52 : 0.34 }))}
                          className={`border px-3.5 py-2 font-mono text-[10px] uppercase tracking-wider2 transition-all duration-200 ${
                            active ? "border-charcoal bg-charcoal text-offwhite" : "border-charcoal/25 hover:border-brass"
                          }`}
                        >
                          {PLACEMENT_LABELS[p]}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {/* Scale */}
                <fieldset className="mt-6">
                  <legend className="label-rohde">Print size</legend>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="font-mono text-[10px] text-concrete-dim">S</span>
                    <input
                      type="range"
                      min={0.14}
                      max={0.85}
                      step={0.01}
                      value={spec.scale}
                      onChange={(e) => setSpec((s) => ({ ...s, scale: Number(e.target.value) }))}
                      className="h-1 w-full appearance-none rounded-full bg-charcoal/15 accent-charcoal"
                      aria-label="Print size"
                    />
                    <span className="font-mono text-[10px] text-concrete-dim">L</span>
                  </div>
                </fieldset>

                {/* Ink */}
                <fieldset className="mt-6">
                  <legend className="label-rohde">Ink</legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(Object.keys(PRINT_INKS) as PrintInkName[]).map((name) => {
                      const active = spec.ink === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSpec((s) => ({ ...s, ink: name }))}
                          className={`border px-3.5 py-2 font-mono text-[10px] uppercase tracking-wider2 transition-all duration-200 ${
                            active ? "border-charcoal bg-charcoal text-offwhite" : "border-charcoal/25 hover:border-brass"
                          }`}
                        >
                          {PRINT_INKS[name].label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {/* Apply */}
                <div className="mt-7 flex items-center gap-3">
                  <button type="button" className="btn-charcoal flex-1" onClick={() => onApply(spec)}>
                    Apply to piece
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
