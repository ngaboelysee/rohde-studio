"use client";

/**
 * Slide-out bag drawer — keyboard navigable (Esc, focus trap), Framer Motion.
 */
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/format";
import { OrbitLogo } from "@/components/brand/OrbitLogo";
import { trackEvent } from "@/lib/analytics/events";

const EASE = [0.16, 1, 0.3, 1] as const;

export function CartDrawer() {
  const { lines, isOpen, close, setQuantity, remove, subtotal } = useCartStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const total = subtotal();

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0] as HTMLElement;
      const last = focusables[focusables.length - 1] as HTMLElement;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previousFocus?.focus();
    };
  }, [isOpen, close]);

  const onCheckoutClick = useCallback(() => {
    trackEvent("checkout_started", {
      value: total,
      currency: lines[0]?.currency ?? "USD",
      contents: lines.map((l) => ({ id: l.variantId, quantity: l.quantity, item_price: l.unitPrice })),
    });
  }, [lines, total]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Shopping bag">
          <motion.button
            type="button"
            aria-label="Close bag"
            className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            onClick={close}
          />

          <motion.aside
            ref={panelRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: EASE }}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-bone shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-charcoal/10 px-6 py-5">
              <h2 className="font-mono text-[11px] uppercase tracking-wider2">
                Bag ({lines.reduce((n, l) => n + l.quantity, 0)})
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Close bag"
                className="font-mono text-[10px] uppercase tracking-wider2 text-concrete-dim transition-colors duration-300 hover:text-brass"
              >
                Esc ✕
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <h3 className="heading-rohde text-xl">Your bag is currently empty.</h3>
                <p className="mt-3 text-sm leading-relaxed text-concrete-dim">
                  Every piece is printed to order in the studio.
                </p>
                <Link href="/products" onClick={close} className="btn-charcoal mt-8">
                  Explore the collection
                </Link>
              </div>
            ) : (
              <>
                <ul className="scroll-rohde flex-1 divide-y divide-charcoal/10 overflow-y-auto px-6">
                  {lines.map((line) => (
                    <li key={line.variantId} className="flex gap-5 py-6">
                      <Link
                        href={`/products/${line.slug}`}
                        onClick={close}
                        className="aspect-[4/5] w-20 shrink-0 overflow-hidden bg-bone-deep"
                        tabIndex={-1}
                        aria-hidden="true"
                      >
                        {line.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={line.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-charcoal/40">
                            <OrbitLogo size={22} />
                          </span>
                        )}
                      </Link>
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium tracking-wide">{line.productName}</p>
                            <p className="label-rohde mt-1.5">{line.color} · Size {line.size}</p>
                          </div>
                          <p className="font-mono text-sm">
                            {formatPrice(line.unitPrice * line.quantity, line.currency)}
                          </p>
                        </div>
                        <div className="mt-auto flex items-center justify-between pt-3">
                          <div className="flex items-center border border-charcoal/20">
                            <button
                              type="button"
                              aria-label={`Decrease quantity of ${line.productName}`}
                              onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                              className="px-3 py-1 font-mono text-sm hover:text-concrete-dim"
                            >
                              −
                            </button>
                            <span className="min-w-7 text-center font-mono text-xs" aria-live="polite">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label={`Increase quantity of ${line.productName}`}
                              onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                              disabled={line.quantity >= line.maxAvailable}
                              className="px-3 py-1 font-mono text-sm hover:text-concrete-dim disabled:opacity-30"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => remove(line.variantId)}
                            className="font-mono text-[10px] uppercase tracking-wider2 text-concrete-dim transition-colors hover:text-error"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-charcoal/10 px-6 py-6">
                  <div className="flex items-center justify-between">
                    <span className="label-rohde">Subtotal</span>
                    <span className="font-mono text-base font-medium">{formatPrice(total)}</span>
                  </div>
                  <p className="label-rohde mt-1.5">Shipping calculated at checkout</p>
                  <Link
                    href="/checkout"
                    onClick={() => {
                      close();
                      onCheckoutClick();
                    }}
                    className="btn-charcoal mt-5 w-full"
                  >
                    Checkout
                  </Link>
                  <button
                    type="button"
                    onClick={close}
                    className="mt-3 w-full py-2 text-center font-mono text-[10px] uppercase tracking-wider2 text-concrete-dim transition-colors duration-300 hover:text-brass"
                  >
                    Continue browsing
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
