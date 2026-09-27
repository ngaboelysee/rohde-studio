"use client";

/**
 * CategoryManager — the admin names the categories customers see.
 * Saves via PUT /api/admin/categories; takes effect on the storefront
 * within a minute (label cache) or instantly after a redeploy.
 */
import { useState } from "react";

type CategoryRow = { value: string; label: string; productCount: number };

export function CategoryManager({ categories: initial }: { categories: CategoryRow[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labels: rows.map((r) => ({ category: r.value, label: r.label })),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.issues?.[0] ?? json?.error ?? "Save failed");
      }
      setFeedback({ ok: true, text: "Category names saved — live on the storefront shortly." });
    } catch (e) {
      setFeedback({ ok: false, text: e instanceof Error ? e.message : "Save failed" });
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

      <div className="border border-white/10 bg-bone-raised">
        {rows.map((row, i) => (
          <div
            key={row.value}
            className={`grid grid-cols-1 items-center gap-3 px-5 py-4 sm:grid-cols-[1fr_1fr_auto] md:px-6 ${
              i > 0 ? "border-t border-white/5" : ""
            }`}
          >
            <div>
              <label
                htmlFor={`cat-${row.value}`}
                className="text-[11px] font-semibold uppercase tracking-widest2 text-concrete"
              >
                Internal key
              </label>
              <p className="mt-1 font-mono text-xs text-concrete">{row.value}</p>
              <p className="mt-0.5 text-xs text-concrete/70">
                {row.productCount} product{row.productCount === 1 ? "" : "s"}
              </p>
            </div>
            <div>
              <label
                htmlFor={`cat-${row.value}`}
                className="mb-2 block text-[11px] font-semibold uppercase tracking-widest2 text-concrete"
              >
                Customer-facing name
              </label>
              <input
                id={`cat-${row.value}`}
                value={row.label}
                maxLength={40}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r) => (r.value === row.value ? { ...r, label: e.target.value } : r))
                  )
                }
                className="min-h-11 w-full border border-white/15 bg-transparent px-4 text-sm text-charcoal transition-colors duration-200 focus:border-brass focus:outline-none"
              />
            </div>
          </div>
        ))}

        <div className="border-t border-white/10 px-5 py-4 md:px-6">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="min-h-11 border border-brass/50 px-8 text-[11px] font-semibold uppercase tracking-widest2 text-brass transition-colors duration-200 hover:bg-brass hover:text-bone-deep disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save category names"}
          </button>
        </div>
      </div>
    </div>
  );
}
