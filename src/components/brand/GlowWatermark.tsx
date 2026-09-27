"use client";

/**
 * GlowWatermark — the faint Rohde orbit mark behind the hero.
 *
 * Sleeps at 7% opacity. As the cursor approaches, the mark breathes toward
 * ~18% and a brass halo blooms behind it, scaled by cursor proximity
 * (near = bright). Reduced motion: static, never glows.
 * Pure pointer-math + rAF — no framer-motion, no layout thrash.
 */
import { useEffect, useRef } from "react";
import { OrbitLogo } from "@/components/brand/OrbitLogo";

const NEAR = 260; // px — distance at which the glow is fully awake

export function GlowWatermark({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const mark = markRef.current;
    if (!el || !mark) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // static 7% opacity mark, no listeners

    let raf = 0;
    let target = 0;   // 0..1 proximity
    let current = 0;  // eased toward target

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const d = Math.hypot(e.clientX - cx, e.clientY - cy);
      target = Math.max(0, Math.min(1, 1 - d / NEAR));
    };
    const onLeave = () => {
      target = 0;
    };

    const tick = () => {
      current += (target - current) * 0.06; // slow breath, the luxe ease
      const glow = current * current;       // ease-in so it blooms late
      mark.style.opacity = String(0.07 + glow * 0.11);
      el.style.setProperty("--glow", String(glow));
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none relative ${className}`}
      style={{ ["--glow" as string]: 0 }}
    >
      {/* brass halo — blooming behind the mark */}
      <div
        className="absolute inset-0 -z-10 scale-110 rounded-full blur-3xl"
        style={{
          opacity: "calc(var(--glow) * 0.32)",
          background:
            "radial-gradient(closest-side, rgba(201,169,98,0.55), rgba(201,169,98,0.12) 55%, transparent 75%)",
        }}
      />
      <div ref={markRef} style={{ opacity: 0.07 }}>
        <OrbitLogo size={560} />
      </div>
    </div>
  );
}
