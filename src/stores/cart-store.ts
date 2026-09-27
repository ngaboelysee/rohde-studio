"use client";

/**
 * Rohde cart store — Zustand with localStorage persistence.
 * Enforces inventory boundaries client-side (max 10 per line, availability
 * ceiling) so the drawer can disable oversell instantly. The server always
 * re-validates at checkout; this store is the friction-killer, not the gate.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartLine = {
  variantId: string;
  productId: string;
  slug: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  image: string | null;
  unitPrice: number;
  currency: string;
  quantity: number;
  maxAvailable: number; // snapshot from server; 99 = unconstrained
};

type CartState = {
  lines: CartLine[];
  isOpen: boolean;
  lastAddedKey: string | null;
  add: (line: Omit<CartLine, "maxAvailable"> & { maxAvailable?: number }) => { ok: boolean; reason?: string };
  remove: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => { ok: boolean; reason?: string };
  open: () => void;
  close: () => void;
  clear: () => void;
  subtotal: () => number;
  count: () => number;
};

export const MAX_LINE_QTY = 10;

/** Hard cap shared by UI + server validation. */
function clampToStock(quantity: number, maxAvailable: number): { qty: number; clamped: boolean } {
  const ceiling = Math.min(MAX_LINE_QTY, Math.max(0, maxAvailable));
  const qty = Math.min(quantity, ceiling);
  return { qty, clamped: qty < quantity };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      isOpen: false,
      lastAddedKey: null,

      add: (incoming) => {
        const maxAvailable = incoming.maxAvailable ?? 99;
        const existing = get().lines.find((l) => l.variantId === incoming.variantId);

        if (maxAvailable <= 0) {
          get().open();
          return { ok: false, reason: "This piece is sold out." };
        }

        if (existing) {
          const target = existing.quantity + incoming.quantity;
          const { qty, clamped } = clampToStock(target, maxAvailable);
          if (qty === existing.quantity) {
            get().open();
            return { ok: false, reason: "No more stock available for this size." };
          }
          set({
            lines: get().lines.map((l) =>
              l.variantId === incoming.variantId ? { ...l, quantity: qty, maxAvailable } : l
            ),
            lastAddedKey: incoming.variantId,
            isOpen: true,
          });
          if (clamped) return { ok: true, reason: "Added — stock limited." };
          return { ok: true };
        }

        const { qty, clamped } = clampToStock(incoming.quantity, maxAvailable);
        if (qty <= 0) {
          get().open();
          return { ok: false, reason: "This piece is sold out." };
        }
        set({
          lines: [
            ...get().lines,
            { ...incoming, quantity: qty, maxAvailable },
          ],
          lastAddedKey: incoming.variantId,
          isOpen: true,
        });
        return clamped ? { ok: true, reason: "Added — stock limited." } : { ok: true };
      },

      remove: (variantId) =>
        set({ lines: get().lines.filter((l) => l.variantId !== variantId) }),

      setQuantity: (variantId, quantity) => {
        const line = get().lines.find((l) => l.variantId === variantId);
        if (!line) return { ok: false, reason: "Item not in bag." };
        if (quantity <= 0) {
          get().remove(variantId);
          return { ok: true };
        }
        const { qty, clamped } = clampToStock(quantity, line.maxAvailable);
        if (clamped) {
          set({
            lines: get().lines.map((l) =>
              l.variantId === variantId ? { ...l, quantity: qty } : l
            ),
          });
          return { ok: false, reason: `Only ${qty} left in stock.` };
        }
        set({
          lines: get().lines.map((l) =>
            l.variantId === variantId ? { ...l, quantity } : l
          ),
        });
        return { ok: true };
      },

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      clear: () => set({ lines: [], lastAddedKey: null }),

      subtotal: () =>
        get().lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),

      count: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),
    }),
    {
      name: "rohde-cart-v1",
      storage: createJSONStorage(() => localStorage),
      // Persist lines only; drawer visibility is session state.
      partialize: (state) => ({ lines: state.lines }),
    }
  )
);
