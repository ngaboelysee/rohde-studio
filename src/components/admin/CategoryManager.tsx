"use client";

/**
 * CategoryManager — categories are fully admin-managed: create new ones,
 * rename any of them, reorder them for the storefront filter bar, and
 * deactivate (hide) without deleting. Saves via the guarded admin API and
 * takes effect on the storefront within a minute (label cache).
 */
import { useState } from "react";

type CategoryRow = {
  id: string;
  slug: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
};

export function CategoryManager({ categories: initial }: { categories: CategoryRow[] }) {
  const [rows, setRows] = useState(initial);
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  function flash(text: string, ok = true) {
    setFeedback({ ok, text });
    window.setTimeout(() => setFeedback(null), 4000);
  }

  function patchLocal(id: string, patch: Partial<CategoryRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function saveRow(row: CategoryRow) {
    setBusy(true);
    setPendingId(row.id);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          label: row.label.trim() || row.slug,
          sortOrder: row.sortOrder,
          isActive: row.isActive,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.issues?.[0] ?? json?.error ?? "Save failed");
      flash(`"${row.label.trim()}" saved`);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Save failed", false);
    } finally {
      setBusy(false);
      setPendingId(null);
    }
  }

  async function createCategory() {
    const label = newLabel.trim();
    if (label.length < 2) {
      flash("Give the new category a name (2+ characters).", false);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, sortOrder: Math.max(0, ...rows.map((r) => r.sortOrder)) + 10 }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.issues?.[0] ?? json?.error ?? "Create failed");
      setRows((prev) => [...prev, { ...json.category, productCount: 0 }]);
      setNewLabel("");
      flash(`Category "${label}" created`);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Create failed", false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {feedback ? (
        <p
          role="status"
          className={`mb-6 border px-5 py-3 text-sm ${
            feedback.ok
              ? "border-success/40 bg-success/10 text-emerald-300"
              : "border-error/40 bg-error/10 text-red-300"
          }`}
        >
          {feedback.text}
        </p>
      ) : null}

      {/* Create a new category */}
      <div className="mb-8 border border-brass/30 bg-brass/[0.04] px-5 py-4 md:px-6">
        <label
          htmlFor="new-category"
          className="mb-2 block text-[11px] font-semibold uppercase tracking-widest2 text-concrete"
        >
          New category
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="new-category"
            value={newLabel}
            maxLength={40}
            placeholder='e.g. "Outerwear" or "Silk Scarves"'
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createCategory();
              }
            }}
            className="min-h-11 w-full border border-white/15 bg-transparent px-4 text-sm text-charcoal transition-colors duration-200 placeholder:text-concrete/50 focus:border-brass focus:outline-none"
          />
          <button
            type="button"
            onClick={createCategory}
            disabled={busy}
            className="min-h-11 shrink-0 border border-brass/50 px-8 text-[11px] font-semibold uppercase tracking-widest2 text-brass transition-colors duration-200 hover:bg-brass hover:text-bone-deep disabled:opacity-40"
          >
            {busy ? "···" : "+ Add category"}
          </button>
        </div>
      </div>

      <div className="border border-white/10 bg-bone-raised">
        {rows.map((row, i) => (
          <div
            key={row.id}
            className={`grid grid-cols-1 items-center gap-3 px-5 py-4 sm:grid-cols-[1.2fr_1fr_5rem_auto_auto] md:px-6 ${
              i > 0 ? "border-t border-white/5" : ""
            } ${row.isActive ? "" : "opacity-60"}`}
          >
            <div>
              <label
                htmlFor={`cat-label-${row.id}`}
                className="mb-2 block text-[11px] font-semibold uppercase tracking-widest2 text-concrete"
              >
                Customer-facing name
              </label>
              <input
                id={`cat-label-${row.id}`}
                value={row.label}
                maxLength={40}
                onChange={(e) => patchLocal(row.id, { label: e.target.value })}
                className="min-h-11 w-full border border-white/15 bg-transparent px-4 text-sm text-charcoal transition-colors duration-200 focus:border-brass focus:outline-none"
              />
              <p className="mt-1 font-mono text-[10px] text-concrete/70">
                {row.slug} · {row.productCount} product{row.productCount === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2 sm:pt-5">
              <input
                id={`cat-active-${row.id}`}
                type="checkbox"
                checked={row.isActive}
                onChange={(e) => patchLocal(row.id, { isActive: e.target.checked })}
                className="accent-brass"
              />
              <label htmlFor={`cat-active-${row.id}`} className="text-[10px] uppercase tracking-widest2 text-concrete">
                {row.isActive ? "Visible" : "Hidden"}
              </label>
            </div>
            <div className="sm:pt-2">
              <label
                htmlFor={`cat-order-${row.id}`}
                className="mb-2 block text-[11px] font-semibold uppercase tracking-widest2 text-concrete"
              >
                Order
              </label>
              <input
                id={`cat-order-${row.id}`}
                type="number"
                min={0}
                max={999}
                value={row.sortOrder}
                onChange={(e) =>
                  patchLocal(row.id, {
                    sortOrder: Math.max(0, Math.min(999, Number(e.target.value) || 0)),
                  })
                }
                className="min-h-11 w-full border border-white/15 bg-transparent px-3 text-center font-mono text-sm text-charcoal transition-colors duration-200 focus:border-brass focus:outline-none"
              />
            </div>
            <div className="flex items-end pb-1 pt-2 sm:pt-8">
              <button
                type="button"
                onClick={() => saveRow(row)}
                disabled={busy || pendingId === row.id}
                className="min-h-9 border border-white/20 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest2 text-concrete transition-colors duration-200 hover:border-brass hover:text-brass disabled:opacity-40"
              >
                {pendingId === row.id ? "···" : "Save"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-concrete/70">
        Changes reach the storefront within a minute. Hiding a category removes it from the filter
        bar without touching its products; deactivation is always reversible.
      </p>
    </div>
  );
}
