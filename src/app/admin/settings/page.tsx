"use client";

/**
 * /admin/settings — store configuration for WhatsApp checkout.
 * Edits the StoreSetting row via the guarded /api/admin/settings API.
 * Money math (fees, conversion, totals) stays server-side; this form
 * only configures values.
 */
import { useEffect, useState } from "react";

type DeliveryArea = { name: string; fee: number; estimate: string };

type Settings = {
  whatsappNumber: string;
  momo: {
    provider: string;
    number: string;
    accountName: string;
    alternates: { provider: string; number: string; accountName: string }[];
  };
  localCurrency: string;
  usdToLocalRate: number;
  deliveryAreas: DeliveryArea[];
  reservationMinutes: number;
  whatsappEnabled: boolean;
};

const inputCls =
  "border border-white/15 bg-transparent px-4 py-2.5 font-mono text-xs text-charcoal placeholder:text-concrete focus:border-brass focus:outline-none";

export default function AdminSettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/settings");
        if (!res.ok) throw new Error("failed");
        const json = (await res.json()) as { settings: Settings };
        setS(json.settings);
      } catch {
        setBanner({ tone: "error", text: "Could not load settings." });
      }
    })();
  }, []);

  if (!s) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8">
        <p className="font-mono text-xs text-concrete">{banner ? banner.text : "Loading…"}</p>
      </div>
    );
  }

  function updateArea(idx: number, patch: Partial<DeliveryArea>) {
    if (!s) return;
    const areas = s.deliveryAreas.map((a, i) => (i === idx ? { ...a, ...patch } : a));
    setS({ ...s, deliveryAreas: areas });
  }

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!s) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; settings?: Settings };
      if (!res.ok || !json.ok) {
        setBanner({ tone: "error", text: json.error ?? "Save failed." });
      } else {
        if (json.settings) setS(json.settings);
        setBanner({ tone: "ok", text: "Settings saved." });
      }
    } catch {
      setBanner({ tone: "error", text: "Network error." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8">
      <header className="mb-8">
        <p className="label-rohde">Store configuration</p>
        <h1 className="heading-rohde mt-2 text-3xl md:text-4xl">Settings</h1>
      </header>

      {banner ? (
        <p
          role="alert"
          className={`mb-6 border px-4 py-3 font-mono text-xs ${
            banner.tone === "ok" ? "border-ok/40 bg-ok/10 text-ok" : "border-error/40 bg-error/10 text-error"
          }`}
        >
          {banner.text}
        </p>
      ) : null}

      <form onSubmit={onSave}>
        <section className="border border-white/10 bg-white/[0.02] p-6">
          <h2 className="label-rohde">WhatsApp channel</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="label-rohde">WhatsApp number (international digits)</span>
              <input
                value={s.whatsappNumber}
                onChange={(e) => setS({ ...s, whatsappNumber: e.target.value })}
                placeholder="250781214230"
                className={inputCls}
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="label-rohde">Reservation window (minutes)</span>
              <input
                type="number"
                min={5}
                max={240}
                value={s.reservationMinutes}
                onChange={(e) => setS({ ...s, reservationMinutes: Number(e.target.value) })}
                className={inputCls}
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="label-rohde">Currency rate (1 USD to local)</span>
              <input
                type="number"
                min={1}
                value={s.usdToLocalRate}
                onChange={(e) => setS({ ...s, usdToLocalRate: Number(e.target.value) })}
                className={inputCls}
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="label-rohde">Local currency code</span>
              <input
                value={s.localCurrency}
                onChange={(e) => setS({ ...s, localCurrency: e.target.value.toUpperCase().slice(0, 3) })}
                className={inputCls}
                maxLength={3}
                required
              />
            </label>
            <label className="flex items-center gap-3 sm:col-span-2">
              <input
                type="checkbox"
                checked={s.whatsappEnabled}
                onChange={(e) => setS({ ...s, whatsappEnabled: e.target.checked })}
                className="accent-brass"
              />
              <span className="text-sm text-charcoal">WhatsApp checkout enabled</span>
            </label>
          </div>
        </section>

        <section className="mt-6 border border-white/10 bg-white/[0.02] p-6">
          <h2 className="label-rohde">Mobile Money receiver</h2>
          <p className="mt-2 font-mono text-xs text-concrete">
            Shown to customers by the WhatsApp bot only — never rendered on the public site.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <label className="flex flex-col gap-2">
              <span className="label-rohde">Provider</span>
              <input
                value={s.momo.provider}
                onChange={(e) => setS({ ...s, momo: { ...s.momo, provider: e.target.value } })}
                className={inputCls}
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="label-rohde">Number</span>
              <input
                value={s.momo.number}
                onChange={(e) => setS({ ...s, momo: { ...s.momo, number: e.target.value } })}
                placeholder="0788123456"
                className={inputCls}
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="label-rohde">Account name</span>
              <input
                value={s.momo.accountName}
                onChange={(e) => setS({ ...s, momo: { ...s.momo, accountName: e.target.value } })}
                className={inputCls}
                required
              />
            </label>
          </div>
        </section>

        <section className="mt-6 border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center justify-between">
            <h2 className="label-rohde">Delivery areas</h2>
            <button
              type="button"
              onClick={() => setS({ ...s, deliveryAreas: [...s.deliveryAreas, { name: "", fee: 0, estimate: "" }] })}
              className="border border-white/15 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-concrete transition-colors hover:border-brass hover:text-brass"
            >
              + Add area
            </button>
          </div>
          <div className="mt-5 space-y-4">
            {s.deliveryAreas.map((a, idx) => (
              <div key={idx} className="grid gap-3 sm:grid-cols-[1.4fr_0.7fr_1.4fr_auto]">
                <label className="flex flex-col gap-2">
                  <span className="label-rohde">Name</span>
                  <input value={a.name} onChange={(e) => updateArea(idx, { name: e.target.value })} className={inputCls} required />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="label-rohde">Fee</span>
                  <input
                    type="number"
                    min={0}
                    value={a.fee}
                    onChange={(e) => updateArea(idx, { fee: Number(e.target.value) })}
                    className={inputCls}
                    required
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="label-rohde">Delivery estimate</span>
                  <input
                    value={a.estimate}
                    onChange={(e) => updateArea(idx, { estimate: e.target.value })}
                    placeholder="Same day (within 4 hours)"
                    className={inputCls}
                    required
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setS({ ...s, deliveryAreas: s.deliveryAreas.filter((_, i) => i !== idx) })}
                  className="self-end border border-error/40 px-3 py-2.5 font-mono text-xs text-error/80 transition-colors hover:bg-error/10"
                  aria-label={"Remove area " + (idx + 1)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="mt-8 w-full border border-brass/60 bg-brass/10 px-6 py-3.5 font-mono text-xs uppercase tracking-wider text-brass transition-colors hover:bg-brass/20 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
