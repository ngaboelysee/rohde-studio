"use client";

/**
 * AnimatedWordmark — the "painted wordmark" hero treatment.
 * Letters rise in with blur + clip reveal, then a brush-stroke underline
 * draws itself. On hover, the letters quieten to grey — monochrome only.
 * Screen readers get plain text.
 */
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

export function AnimatedWordmark({
  text = "ROHDE",
  className = "",
}: {
  text?: string;
  className?: string;
}) {
  const letters = Array.from(text);

  return (
    <motion.span
      className={`block cursor-default ${className}`}
      aria-label={text}
      role="heading"
      aria-level={1}
      initial="rest"
      whileHover="hover"
      animate="rest"
    >
      <span className="flex overflow-visible" aria-hidden="true">
        {letters.map((ch, i) => (
          <motion.span
            key={`${ch}-${i}`}
            className="inline-block will-change-[transform,filter,color]"
            variants={{
              rest: {
                y: "0%",
                opacity: 1,
                filter: "blur(0px)",
                color: "#FBFBFB",
                transition: { duration: 0.45, delay: (letters.length - i) * 0.055, ease: EASE },
              },
              hover: {
                color: "#C9A962",
                transition: { duration: 0.3, delay: i * 0.07, ease: EASE },
              },
            }}
            initial={{ y: "115%", opacity: 0, filter: "blur(14px)" }}
            animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 1, delay: 0.2 + i * 0.1, ease: EASE }}
          >
            {ch}
          </motion.span>
        ))}
      </span>

      {/* Brush stroke underline — draws itself, then follows the letters
          to brass on hover after a deliberate pause */}
      <motion.svg
        viewBox="0 0 600 18"
        className="mt-1 h-3 w-[72%] text-charcoal"
        fill="none"
        aria-hidden="true"
      >
        <motion.path
          d="M4 12 C 120 4, 260 16, 380 9 S 560 6, 596 10"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          variants={{
            rest: {
              pathLength: 1,
              opacity: 1,
              color: "#0B0B0B",
              transition: {
                pathLength: { duration: 1.1, delay: 0.9, ease: "easeOut" },
                opacity: { duration: 0.3, delay: 0.9 },
                color: { duration: 0.45, delay: 0.5, ease: EASE },
              },
            },
            // Brass arrives only after the letters have finished their own
            // turn (last letter settles ≈0.58s) — a deliberate beat, then it follows.
            hover: {
              pathLength: 1,
              opacity: 1,
              color: "#C9A962",
              transition: {
                color: { duration: 0.35, delay: 0.65, ease: EASE },
              },
            },
          }}
        />
      </motion.svg>
    </motion.span>
  );
}
