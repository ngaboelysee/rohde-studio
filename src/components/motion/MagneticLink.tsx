"use client";

/**
 * MagneticLink — GSAP-spec magnetic hover (ui-ux-pro-max, Hover
 * Micro-interaction / Complex): pull strength clamped to ×0.3 so the element
 * never leaves its hit box, spring snap-back on leave, and a full bypass
 * under `prefers-reduced-motion` (transform rendered at its neutral state).
 * Next.js Link keeps client-side navigation.
 */
import { useRef } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
  /** Pull strength multiplier — spec clamps at 0.3. */
  strength?: number;
};

export function MagneticLink({ href, children, className = "", strength = 0.3 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 14, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 180, damping: 14, mass: 0.4 });

  function onMove(e: React.MouseEvent) {
    if (reduceMotion) return; // static under reduced motion
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
  }
  function onLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <Link href={href} className="inline-block">
      <motion.span
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        whileHover={reduceMotion ? undefined : { scale: 1.03 }}
        style={{ x: sx, y: sy }}
        className={`inline-block ${className}`}
      >
        {children}
      </motion.span>
    </Link>
  );
}
