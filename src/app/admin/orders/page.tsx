"use client";

/**
 * /admin/orders — WhatsApp + mobile-money order ledger.
 *
 * Shows every whatsapp-channel order with its payment ledger: verified total,
 * remaining balance, transaction references, verification status. Admin
 * actions (verify / under-review / cancel) go through the guarded,
 * audit-logged /api/admin/payments API — never direct from the client.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/format";

type AdminOrderRow = {
  id: string;
  orderNumber: string;
  channel: string;
  status: string;
  paymentStatus: string;
  waState: string | null;
  customer: string;
  phone: string | null;
  email: string;
  address: string;
  deliveryInstructions: string | null;
  total: number;
  currency: string;
  verified: number;
  balance: number;
  overpaid: number;
  provider: string;
  expiresAt: string | null;
  createdAt: string;
  items: { productName: string; size: string; color: string; quantity: number; unitPrice: number }[];
  payments: {
    id: string;
    provider: string;
    status: string;
    amount: number;
    currency: string;
    providerRef: string | null;
    sender: string | null;
    receiver: string | null;
    verificationSource: string | null;
    verifiedAt: string | null;
    createdAt: string;
  }[];
  recentEvents: { kind: string; message: string; createdAt: string }[];
};

const PAYMENT_BADGE: Record<string, string> = {
  PAID: "bg-ok/15 text-ok border-ok/40",
  PARTIALLY_PAID: "bg-brass/15 text-brass border-brass/40",
  UNDER_REVIEW: "bg-brass/15 text-brass border-brass/40",
  VERIFICATION_PENDING: "bg-brass/15 text-brass border-brass/40",
  REJECTED: "bg-error/15 text-error border-error/40",
  FAILED: "bg-error/15 text-error border-error/40",
  INITIATED: "bg-white/5 text-concrete border-white/10",
};

const ORDER_BADGE: Record<string, string> = {
  CONFIRMED: "bg-ok/15 text-ok border-ok/40",
  PREPARING: "bg-brass/15 text-brass border-brass/40",
  OUT_FOR_DELIVERY: "bg-brass/15 text-brass border-brass/40",
  DELIVERED: "bg-white/10 text-charcoal border-white/20",
  CANCELLED: "bg-error/15 text-error border-error/40",
  FAILED: "bg-error/15 text-error border-error/40",
  PENDING: "bg-white/5 text-concrete border-white/10",
};

function Badge({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`inline-block border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${cls}`}>
      {label.replaceAll("_", " ")}
    </span>
  );
}

function needsReview(o: AdminOrderRow): boolean {
  if (o.status !== "PENDING" && o.status !== "CONFIRMED") return false;
  if (["UNDER_REVIEW", "VERIFICATION_PENDING", "PARTIALLY_PAID"].includes(o.paymentStatus)) return true;
  return o.overpaid > 0;
}

function fmtWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [verifyRef, setVerifyRef] = useState<Record<string, string>>({});
  const [verifyAmt, setVerifyAmt] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("failed");
      const json = (await res.json()) as { orders: AdminOrderRow[] };
      setOrders(json.orders ?? []);
    } catch {
      setBanner({ tone: "error", text: "Could not load orders." });
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const t = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [load]);

  const reviewCount = useMemo(() => orders.filter(needsReview).length, [orders]);

  async function act(orderId: string, action: string, extra: Record<string, unknown> = {}) {
    setBusyId(orderId);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, orderId, ...extra }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setBanner({ tone: "error", text: json.error ?? "Action failed." });
        return;
      }
      setBanner({ tone: "ok", text: action === "verify" ? "Payment recorded as verified." : "Order updated." });
      await load();
    } catch {
      setBanner({ tone: "error", text: "Network error." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-rohde">Payments &amp; fulfilment</p>
          <h1 className="heading-rohde mt-2 text-3xl md:text-4xl">WhatsApp orders</h1>
        </div>
        <p className="font-mono text-xs text-concrete">
          {reviewCount > 0 ? `${reviewCount} order(s) need attention` : "All clear"}
        </p>
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

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search order #, phone, email…"
          aria-label="Search orders"
          className="w-full max-w-sm border border-white/15 bg-transparent px-4 py-2.5 font-mono text-xs text-charcoal placeholder:text-concrete focus:border-brass focus:outline-none"
        />
        <button
          onClick={load}
          className="border border-white/15 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-charcoal transition-colors hover:border-brass hover:text-brass"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="font-mono text-xs text-concrete">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="border border-white/10 bg-white/[0.02] px-5 py-8 text-center font-mono text-xs text-concrete">
          No WhatsApp orders yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => {
            const review = needsReview(o);
            const actionOpen = o.status === "PENDING" || o.paymentStatus === "UNDER_REVIEW" || o.overpaid > 0;
            return (
              <li
                key={o.id}
                className={`border bg-white/[0.02] p-5 md:p-6 ${review ? "border-brass/50" : "border-white/10"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm text-charcoal">#{o.orderNumber}</p>
                    <p className="label-rohde mt-1">
                      {o.customer} · {o.phone ?? o.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      label={o.paymentStatus}
                      cls={PAYMENT_BADGE[o.paymentStatus] ?? "bg-white/5 text-concrete border-white/10"}
                    />
                    <Badge label={o.status} cls={ORDER_BADGE[o.status] ?? "bg-white/5 text-concrete border-white/10"} />
                    {review ? <Badge label="Review" cls="bg-brass/20 text-brass border-brass/60" /> : null}
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-white/10 pt-4 font-mono text-xs md:grid-cols-4">
                  <div>
                    <dt className="text-concrete">Total</dt>
                    <dd className="mt-1 text-charcoal">{formatPrice(o.total, o.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-concrete">Verified</dt>
                    <dd className="mt-1 text-charcoal">{formatPrice(o.verified, o.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-concrete">Balance</dt>
                    <dd className="mt-1 text-charcoal">{formatPrice(o.balance, o.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-concrete">Placed</dt>
                    <dd className="mt-1 text-charcoal">{fmtWhen(o.createdAt)}</dd>
                  </div>
                </dl>

                <p className="mt-4 font-mono text-xs text-concrete">
                  {o.address}
                  {o.deliveryInstructions ? ` · ${o.deliveryInstructions}` : ""}
                </p>

                <ul className="mt-4 space-y-1.5 border-t border-white/10 pt-4">
                  {o.items.map((i, idx) => (
                    <li key={idx} className="flex justify-between font-mono text-xs text-charcoal">
                      <span>
                        {i.quantity} × {i.productName} ({i.color}, {i.size})
                      </span>
                      <span>{formatPrice(i.unitPrice * i.quantity, o.currency)}</span>
                    </li>
                  ))}
                </ul>

                {o.payments.length > 0 ? (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <p className="label-rohde mb-2">Payment ledger</p>
                    <ul className="space-y-1.5">
                      {o.payments.map((p) => (
                        <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                          <span className="text-charcoal">
                            {p.providerRef ?? "(no ref)"} · {p.status}
                          </span>
                          <span className="text-concrete">
                            {formatPrice(p.amount, p.currency)}
                            {p.verificationSource ? ` · via ${p.verificationSource}` : ""}
                            {p.verifiedAt ? ` · ${fmtWhen(p.verifiedAt)}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {actionOpen ? (
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="label-rohde mb-3">Actions</p>
                    <div className="flex flex-wrap items-end gap-3">
                      <label className="flex flex-col gap-1">
                        <span className="label-rohde">Tx reference</span>
                        <input
                          value={verifyRef[o.id] ?? ""}
                          onChange={(e) => setVerifyRef({ ...verifyRef, [o.id]: e.target.value })}
                          placeholder="e.g. 1234567890123"
                          className="w-48 border border-white/15 bg-transparent px-3 py-2 font-mono text-xs text-charcoal placeholder:text-concrete focus:border-brass focus:outline-none"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="label-rohde">Amount</span>
                        <input
                          value={verifyAmt[o.id] ?? ""}
                          onChange={(e) => setVerifyAmt({ ...verifyAmt, [o.id]: e.target.value })}
                          placeholder={String(o.balance > 0 ? o.balance : o.total)}
                          inputMode="decimal"
                          className="w-32 border border-white/15 bg-transparent px-3 py-2 font-mono text-xs text-charcoal placeholder:text-concrete focus:border-brass focus:outline-none"
                        />
                      </label>
                      <button
                        onClick={() =>
                          act(o.id, "verify", {
                            reference: (verifyRef[o.id] ?? "").trim(),
                            amount: Number(verifyAmt[o.id] || o.balance || o.total),
                            currency: o.currency,
                          })
                        }
                        disabled={busyId === o.id || !(verifyRef[o.id] ?? "").trim()}
                        className="border border-brass/60 bg-brass/10 px-4 py-2 font-mono text-xs uppercase tracking-wider text-brass transition-colors hover:bg-brass/20 disabled:opacity-40"
                      >
                        {busyId === o.id ? "…" : "Verify payment"}
                      </button>
                      {o.paymentStatus !== "UNDER_REVIEW" ? (
                        <button
                          onClick={() => act(o.id, "under_review")}
                          disabled={busyId === o.id}
                          className="border border-white/15 px-4 py-2 font-mono text-xs uppercase tracking-wider text-concrete transition-colors hover:border-brass hover:text-brass disabled:opacity-40"
                        >
                          Under review
                        </button>
                      ) : null}
                      <button
                        onClick={() => act(o.id, "cancel")}
                        disabled={busyId === o.id || o.status !== "PENDING"}
                        className="border border-error/40 px-4 py-2 font-mono text-xs uppercase tracking-wider text-error/80 transition-colors hover:bg-error/10 disabled:opacity-40"
                      >
                        Cancel + release
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
