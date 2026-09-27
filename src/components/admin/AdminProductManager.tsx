"use client";

/**
 * Admin product manager — inventory/stock updates and image uploads via the
 * guarded admin API. Optimistic UI with per-row status feedback.
 * Stock cells carry semantic color: red = sold out, brass = low (≤3),
 * off-white = healthy — color reinforces the number, never replaces it.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { ProductForm } from "@/components/admin/ProductForm";

type AdminVariant = {
  id: string;
  sku: string;
  size: string;
  color: string;
  onHand: number;
  reserved: number;
};

type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  status: string;
  category: string;
  basePrice: string;
  currency: string;
  isFeatured: boolean;
  imageCount: number;
  variants: AdminVariant[];
};

export function AdminProductManager({ products: initial }: { products: AdminProduct[] }) {
  const [products, setProducts] = useState(initial);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "error">("ok");
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);
  const [formState, setFormState] = useState<
    | { mode: "create" }
    | { mode: "edit"; product: AdminProduct }
    | null
  >(null);

  function flash(text: string, ok = true) {
    setMessage(text);
    setTone(ok ? "ok" : "error");
    window.setTimeout(() => setMessage(null), 4000);
  }

  async function updateStock(variantId: string, onHand: number, key: string) {
    setBusyKey(key);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, onHand }),
      });
      if (res.status === 404) throw new Error("Access revoked — sign in again");
      if (!res.ok) throw new Error("Update failed");
      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          variants: p.variants.map((v) => (v.id === variantId ? { ...v, onHand } : v)),
        }))
      );
      flash(`Stock saved for ${key.split("-").pop()}`);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Update failed", false);
    } finally {
      setBusyKey(null);
    }
  }

  async function toggleFeatured(productId: string, isFeatured: boolean) {
    setBusyKey(productId);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, isFeatured }),
      });
      if (!res.ok) throw new Error("Update failed");
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, isFeatured } : p)));
      flash(isFeatured ? "Marked as featured" : "Removed from featured");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Update failed", false);
    } finally {
      setBusyKey(null);
    }
  }

  async function uploadImage(productId: string, file: File) {
    setBusyKey(productId);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("productId", productId);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      if (res.status === 404) throw new Error("Access revoked — sign in again");
      if (!res.ok) throw new Error("Upload failed");
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, imageCount: p.imageCount + 1 } : p))
      );
      flash("Image uploaded to studio storage");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Upload failed", false);
    } finally {
      setBusyKey(null);
      setUploadTarget(null);
    }
  }

  function stockTone(onHand: number): { text: string; bar: string } {
    if (onHand === 0) return { text: "text-red-300", bar: "bg-error" };
    if (onHand <= 3) return { text: "text-brass", bar: "bg-brass" };
    return { text: "text-charcoal", bar: "bg-emerald-400/70" };
  }

  async function reload() {
    // Full refresh is the safest way to pick up created/edited products —
    // the page is dynamic and cheap to re-render.
    window.location.reload();
  }

  return (
    <div>
      {formState ? (
        <ProductForm
          initial={
            formState.mode === "edit"
              ? {
                  id: formState.product.id,
                  name: formState.product.name,
                  slug: formState.product.slug,
                  category: formState.product.category,
                  basePrice: formState.product.basePrice,
                  currency: formState.product.currency,
                  status: formState.product.status,
                  isFeatured: formState.product.isFeatured,
                }
              : undefined
          }
          onDone={(msg) => {
            setFormState(null);
            flash(msg);
            reload();
          }}
          onCancel={() => setFormState(null)}
        />
      ) : null}

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-concrete">
          {products.length} product{products.length === 1 ? "" : "s"} in the catalog
        </p>
        <button
          type="button"
          onClick={() => setFormState({ mode: "create" })}
          className="min-h-11 border border-brass/50 px-6 text-[11px] font-semibold uppercase tracking-widest2 text-brass transition-colors duration-200 hover:bg-brass hover:text-bone-deep"
        >
          + New product
        </button>
      </div>

      {message ? (
        <motion.p
          role="status"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 border px-5 py-3 text-sm ${
            tone === "ok" ? "border-success/40 bg-success/10 text-emerald-300" : "border-error/40 bg-error/10 text-red-300"
          }`}
        >
          {message}
        </motion.p>
      ) : null}

      <div className="space-y-8">
        {products.map((product) => {
          const total = product.variants.reduce((s, v) => s + Math.max(0, v.onHand - v.reserved), 0);
          return (
            <section key={product.id} aria-label={product.name} className="border border-white/10 bg-bone-raised">
              {/* Product header row */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 md:px-6">
                <div className="min-w-0">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-charcoal">{product.name}</h2>
                  <p className="mt-1 text-xs text-concrete">
                    {product.category} · {product.basePrice} {product.currency} ·{" "}
                    <span className={total === 0 ? "text-red-300" : total <= 5 ? "text-brass" : "text-emerald-300"}>
                      {total} available
                    </span>{" "}
                    · {product.imageCount} image{product.imageCount === 1 ? "" : "s"}
                  </p>
                </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setFormState({ mode: "edit", product })}
                  className="min-h-9 border border-white/20 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest2 text-concrete transition-colors duration-200 hover:border-brass hover:text-brass"
                >
                  Edit
                </button>
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[11px] uppercase tracking-widest2 text-concrete transition-colors duration-200 hover:text-charcoal">
                    <input
                      type="checkbox"
                      checked={product.isFeatured}
                      onChange={(e) => toggleFeatured(product.id, e.target.checked)}
                      disabled={busyKey === product.id}
                      className="accent-brass"
                    />
                    Featured
                  </label>
                  <span
                    className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-widest2 ${
                      product.status === "ACTIVE"
                        ? "border border-success/40 bg-success/10 text-emerald-300"
                        : product.status === "DRAFT"
                          ? "border-brass/40 bg-brass/10 text-brass"
                          : "border-white/20 bg-white/5 text-concrete"
                    }`}
                  >
                    {product.status}
                  </span>
                </div>
              </div>

              {/* Variants table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <caption className="sr-only">Inventory for {product.name}</caption>
                  <thead>
                    <tr className="border-b border-white/10 text-left">
                      {["SKU", "Size", "Color", "On hand", "Reserved", "Available", ""].map((h, i) => (
                        <th key={i} scope="col" className="px-4 py-3 md:px-6">
                          <span className="label-rohde font-semibold">{h}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {product.variants.map((variant) => {
                      const available = Math.max(0, variant.onHand - variant.reserved);
                      const tone = stockTone(available);
                      const key = `${product.id}-${variant.id}`;
                      return (
                        <tr key={variant.id} className="transition-colors duration-200 hover:bg-white/[0.03]">
                          <td className="px-4 py-3 font-mono text-xs text-concrete md:px-6">{variant.sku}</td>
                          <td className="px-4 py-3 text-charcoal">{variant.size}</td>
                          <td className="px-4 py-3 text-concrete">{variant.color}</td>
                          <td className="px-4 py-3">
                            <label className="sr-only" htmlFor={`stock-${variant.id}`}>
                              Stock for {variant.sku}
                            </label>
                            <input
                              id={`stock-${variant.id}`}
                              type="number"
                              min={0}
                              defaultValue={variant.onHand}
                              className="w-20 border border-white/15 bg-transparent px-3 py-1.5 text-sm text-charcoal transition-colors duration-200 focus:border-brass focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-3 text-concrete">{variant.reserved}</td>
                          <td className={`px-4 py-3 font-mono font-bold ${tone.text}`}>
                            {available === 0 ? "OUT" : available}
                          </td>
                          <td className="px-4 py-3 md:px-6">
                            <button
                              type="button"
                              disabled={busyKey === key}
                              onClick={(e) => {
                                const input = document.getElementById(`stock-${variant.id}`) as HTMLInputElement | null;
                                const value = Number(input?.value ?? variant.onHand);
                                if (Number.isFinite(value) && value >= 0) {
                                  updateStock(variant.id, Math.floor(value), key);
                                }
                              }}
                              className="min-h-9 border border-white/20 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest2 text-concrete transition-colors duration-200 hover:border-brass hover:text-brass disabled:opacity-40"
                            >
                              {busyKey === key ? "···" : "Save"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Upload row */}
              <div className="border-t border-white/10 px-5 py-4 md:px-6">
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-[11px] uppercase tracking-widest2 text-concrete transition-colors duration-200 hover:text-brass">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadImage(product.id, file);
                      e.target.value = "";
                    }}
                  />
                  {uploadTarget === product.id ? "Uploading…" : "Upload campaign image +"}
                </label>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
