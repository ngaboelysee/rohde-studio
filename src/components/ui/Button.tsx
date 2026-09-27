"use client";

import { forwardRef } from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", loading = false, className = "", children, disabled, ...props },
  ref
) {
  const base =
    "inline-flex min-h-11 items-center justify-center gap-2 px-8 py-3 text-[12px] font-semibold uppercase tracking-widest2 transition-all duration-300 ease-luxe disabled:cursor-not-allowed disabled:opacity-40";
  const variants = {
    primary: "bg-charcoal text-offwhite hover:bg-charcoal/85 hover:text-brass",
    ghost: "border border-charcoal/30 text-charcoal hover:border-brass hover:text-brass",
    danger: "border border-error/60 text-error hover:bg-error hover:text-offwhite",
  } as const;

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  );
});
