"use client";

/**
 * ProductForm — create a new product or edit an existing one:
 * name, slug, category, price, currency, description, story, materials,
 * drop name, status, featured. Posts to the guarded admin API.
 */
import { useState } from "react";

export type ProductFormData = {
  id?: string;
  name: string;
  slug: string;
  category: string; // category slug
  basePrice: string;
  currency: string;
  description: string;
  story: string;
  dropName: string;
  materials: string;
  status: string;
  isFeatured: boolean;
};

/** Category choices come from the admin-managed table, passed by the page. */
export type CategoryOption = { slug: string; label: string };

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function ProductForm({
  initial,
  categories,
  onDone,
  onCancel,
}: {
  initial?: Partial<ProductFormData> & { id?: string };
  categories: CategoryOption[];
  onDone: (msg: string) => void;
  onCancel: () => void;
}) {
  const editing = Boolean(initial?.id);
  const [form, setForm] = useState<ProductFormData>({
    id: initial?.id,
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    category: initial?.category ?? "TOPS",
    basePrice: initial?.basePrice ?? "",
    currency: initial?.currency ?? "USD",
    description: initial?.description ?? "",
    story: initial?.story ?? "",
    dropName: initial?.dropName ?? "",
    materials: initial?.materials ?? "",
    status: initial?.status ?? "DRAFT",
    isFeatured: initial?.isFeatured ?? false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const materials = form.materials
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);

    const payload = {
      name: form.name.trim(),
      ...(editing
        ? {}
        : { slug: form.slug.trim() || slugify(form.name.trim()) }),
      category: form.category,
      status: form.status,
      basePrice: Number(form.basePrice),
      currency: form.currency.trim().toUpperCase(),
      description: form.description.trim(),
      story: form.story.trim(),
      dropName: form.dropName.trim(),
      isFeatured: form.isFeatured,
      materials,
    };

    try {
      const res = await fetch("/api/admin/products", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { ...payload, productId: form.id } : payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.issues?.[0] ?? json?.error ?? "Save failed");
      }
      onDone(editing ? "Product updated." : `Product "${form.name.trim()}" created.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setBusy(false);
    }
  }

  const inputCls =
    "min-h-11 w-full border border-white/15 bg-transparent px-4 text-sm text-charcoal transition-colors duration-200 placeholder:text-concrete/50 focus:border-brass focus:outline-none";
  const labelCls = "mb-2 block text-[11px] font-semibold uppercase tracking-widest2 text-concrete";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-bone-deep/90 p-4 backdrop-blur-sm md:p-10">
      <form
        onSubmit={submit}
        className="w-full max-w-2xl border border-white/10 bg-bone-raised p-6 md:p-8"
        aria-label={editing ? "Edit product" : "New product"}
      >
        <h2 className="font-display text-xl font-bold uppercase tracking-tighter2 text-charcoal">
          {editing ? "Edit product" : "New product"}
        </h2>

        {error ? (
          <p role="alert" className="mt-4 border border-error/40 bg-error/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="pf-name">Product name *</label>
            <input id="pf-name" required minLength={2} maxLength={140} value={form.name}
              onChange={(e) => set("name", e.target.value)} className={inputCls}
              placeholder="e.g. Orbit Heavy Jumper" />
          </div>

          {!editing ? (
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="pf-slug">URL slug (optional)</label>
              <input id="pf-slug" value={form.slug} onChange={(e) => set("slug", e.target.value)}
                className={inputCls} placeholder="auto-generated from the name" />
            </div>
          ) : null}

          <div>
            <label className={labelCls} htmlFor="pf-category">Category</label>
            <select id="pf-category" value={form.category} onChange={(e) => set("category", e.target.value)}
              className={inputCls}>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls} htmlFor="pf-drop">Drop / collection</label>
            <input id="pf-drop" value={form.dropName} onChange={(e) => set("dropName", e.target.value)}
              className={inputCls} placeholder="e.g. ORBIT 001" maxLength={60} />
          </div>

          <div>
            <label className={labelCls} htmlFor="pf-price">Base price *</label>
            <input id="pf-price" required type="number" min={0} step="0.01" value={form.basePrice}
              onChange={(e) => set("basePrice", e.target.value)} className={inputCls} placeholder="260" />
          </div>

          <div>
            <label className={labelCls} htmlFor="pf-currency">Currency</label>
            <select id="pf-currency" value={form.currency} onChange={(e) => set("currency", e.target.value)}
              className={inputCls}>
              {["USD", "EUR", "GBP", "RWF", "NGN", "KES", "GHS"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="pf-desc">Description * <span className="normal-case text-concrete/60">(min 20 chars)</span></label>
            <textarea id="pf-desc" required minLength={20} maxLength={4000} rows={3} value={form.description}
              onChange={(e) => set("description", e.target.value)} className={`${inputCls} py-3`}
              placeholder="Fabric, cut, feel…" />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="pf-story">Editorial story</label>
            <textarea id="pf-story" maxLength={2000} rows={2} value={form.story}
              onChange={(e) => set("story", e.target.value)} className={`${inputCls} py-3`}
              placeholder="The PDP lookbook line (optional)" />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="pf-materials">Materials <span className="normal-case text-concrete/60">(comma-separated)</span></label>
            <input id="pf-materials" value={form.materials} onChange={(e) => set("materials", e.target.value)}
              className={inputCls} placeholder="450gsm loopback cotton, Ribbed trims" />
          </div>

          <div>
            <label className={labelCls} htmlFor="pf-status">Status</label>
            <select id="pf-status" value={form.status} onChange={(e) => set("status", e.target.value)}
              className={inputCls}>
              {["DRAFT", "ACTIVE", "ARCHIVED"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <label className="flex items-end gap-3 pb-1 text-[11px] uppercase tracking-widest2 text-concrete">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)}
              className="accent-brass" />
            Featured on home
          </label>
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <button type="submit" disabled={busy}
            className="min-h-11 border border-brass/50 px-8 text-[11px] font-semibold uppercase tracking-widest2 text-brass transition-colors duration-200 hover:bg-brass hover:text-bone-deep disabled:opacity-40">
            {busy ? "Saving…" : editing ? "Save changes" : "Create product"}
          </button>
          <button type="button" onClick={onCancel}
            className="min-h-11 border border-white/20 px-8 text-[11px] font-semibold uppercase tracking-widest2 text-concrete transition-colors duration-200 hover:text-charcoal">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
