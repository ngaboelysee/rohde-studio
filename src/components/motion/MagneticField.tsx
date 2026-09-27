"use client";

/**
 * MagneticField — one global listener, every button magnetic.
 *
 * Delegated `pointermove` on <body> finds buttons under the cursor
 * (.btn-charcoal / .btn-ghost) and applies the GSAP-spec magnetic pull
 * (clamped ×0.3, spring snap-back via CSS transition). One listener for
 * the whole app instead of per-button handlers; rAF-throttled; inert
 * under `prefers-reduced-motion`.
 */
import { useEffect } from "react";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export function MagneticField() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return; // touch devices

    let raf = 0;
    let last: HTMLElement | null = null;

    const apply = (el: HTMLElement, dx: number, dy: number) => {
      el.style.transition = `transform 80ms linear, color 300ms ${EASE}`;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const release = (el: HTMLElement) => {
      el.style.transition = `transform 500ms ${EASE}, color 300ms ${EASE}`;
      el.style.transform = "translate(0px, 0px)";
    };

    const onMove = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const target = (e.target as Element | null)?.closest?.(
          ".btn-charcoal, .btn-ghost"
        ) as HTMLElement | null;

        if (last && last !== target) release(last);
        if (!target) {
          last = null;
          return;
        }

        const r = target.getBoundingClientRect();
        const pull = 0.3; // GSAP-spec clamp — never leaves the hit box
        apply(
          target,
          (e.clientX - (r.left + r.width / 2)) * pull,
          (e.clientY - (r.top + r.height / 2)) * pull
        );
        last = target;
      });
    };

    const onLeave = () => {
      if (last) release(last);
      last = null;
    };

    document.body.addEventListener("pointermove", onMove, { passive: true });
    document.body.addEventListener("pointerleave", onLeave);
    return () => {
      document.body.removeEventListener("pointermove", onMove);
      document.body.removeEventListener("pointerleave", onLeave);
      if (last) release(last as HTMLElement);
    };
  }, []);

  return null;
}
