"use client";

/**
 * FadeIn — client wrapper for scroll/entrance reveals inside server pages.
 * Delays are staggered via the `delay` prop.
 */
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

export function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.65, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
