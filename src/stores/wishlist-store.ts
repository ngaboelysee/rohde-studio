"use client";

/**
 * Wishlist store — localStorage persistence, mirrors cart patterns.
 * Server sync happens for signed-in customers via /api/wishlist.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type WishlistEntry = {
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  price: number;
  currency: string;
  addedAt: number;
};

type WishlistState = {
  entries: WishlistEntry[];
  toggle: (entry: WishlistEntry) => boolean; // returns true if now saved
  has: (productId: string) => boolean;
  clear: () => void;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      entries: [],
      toggle: (entry) => {
        const exists = get().entries.some((e) => e.productId === entry.productId);
        if (exists) {
          set({ entries: get().entries.filter((e) => e.productId !== entry.productId) });
          return false;
        }
        set({ entries: [{ ...entry, addedAt: Date.now() }, ...get().entries] });
        return true;
      },
      has: (productId) => get().entries.some((e) => e.productId === productId),
      clear: () => set({ entries: [] }),
    }),
    {
      name: "rohde-wishlist-v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
