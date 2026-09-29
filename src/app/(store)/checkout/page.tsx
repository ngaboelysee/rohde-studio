"use client";

/**
 * Checkout — guest-first, no login required. Validates with Zod, submits to
 * /api/checkout (server re-validates + re-prices + re-checks inventory).
 *
 * WhatsApp channel: the server creates a PENDING order with reserved stock
 * and returns a wa.me deep link pre-filled with the order summary — the
 * customer never copies a number and never sees receiving-account details.
 * Totals shown here are informational; the server computes the real ones.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { checkoutSchema } from "@/lib/validation";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/format";
import { trackEvent } from "@/lib/analytics/events";

type StoreConfig = {
  whatsappEnabled: boolean;
  whatsappNumber: string;
  localCurrency: string;
  usdToLocalRate: number;
  deliveryAreas: { name: string; fee: number; estimate: string }[];
  reservationMinutes: number;
};

type WaResult = {
  orderNumber: string;
  whatsappUrl: string;
  expiresAt: string;
  total: number;
  currency: string;
  estimate: string;
};

const CARD_PAYMENTS = [
  { id: "PAYSTACK", label: "Paystack", hint: "Cards & bank" },
  { id: "FLUTTERWAVE", label: "Flutterwave", hint: "Cards, Africa corridors" },
  { id: "STRIPE", label: "Stripe", hint: "Visa · Mastercard · Amex" },
] as const;

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotal, clear } = useCartStore();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [provider, setProvider] = useState<string>("WHATSAPP");
  const [areaName, setAreaName] = useState<string>("");
  const [waResult, setWaResult] = useState<WaResult | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/store-config");
        if (!res.ok) return;
        const json = (await res.json()) as { config: StoreConfig };
        setConfig(json.config);
        if (json.config.whatsappEnabled) {
          setProvider("WHATSAPP");
          setAreaName(json.config.deliveryAreas[0]?.name ?? "");
        } else {
          setProvider("STRIPE");
        }
      } catch {
        // config unavailable → gateway-only checkout still works
      }
    })();
  }, []);

  const isWa = provider === "WHATSAPP" && !!config?.whatsappEnabled;
  const total = subtotal();
  const currency = lines[0]?.currency ?? "USD";

  const area = useMemo(
    () => config?.deliveryAreas.find((a) => a.name === areaName) ?? config?.deliveryAreas[0] ?? null,
    [config, areaName]
  );
  const localSubtotal = isWa && config ? Math.round(total * config.usdToLocalRate) : 0;
  const localTotal = isWa && config ? localSubtotal + (area?.fee ?? 0) : 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    const fd = new FormData(e.currentTarget);
    const raw = {
      email: String(fd.get("email") ?? ""),
      fullName: String(fd.get("fullName") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      line1: String(fd.get("line1") ?? ""),
      line2: String(fd.get("line2") ?? ""),
      city: String(fd.get("city") ?? ""),
      region: String(fd.get("region") ?? ""),
      postalCode: String(fd.get("postalCode") ?? ""),
      country: String(fd.get("country") ?? "").toUpperCase(),
      provider,
      deliveryArea: isWa ? areaName : "",
      deliveryInstructions: String(fd.get("deliveryInstructions") ?? ""),
    };

    const parsed = checkoutSchema.safeParse(raw);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
      }
      if (isWa && !areaName) errors.deliveryArea = "Choose a delivery area";
      setFieldErrors(errors);
      return;
    }
    if (isWa && !area) {
      setFieldErrors({ deliveryArea: "Choose a delivery area" });
      return;
    }
    setFieldErrors({});

    if (lines.length === 0) {
      setServerError("Your bag is empty.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: parsed.data,
          items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        channel?: string;
        redirectUrl?: string | null;
        orderNumber?: string;
        whatsappUrl?: string;
        expiresAt?: string;
        error?: string;
      };

      if (!res.ok || !json.ok) {
        setServerError(json.error ?? "Checkout failed. Please try again.");
        setSubmitting(false);
        return;
      }

      if (json.channel === "whatsapp" && json.whatsappUrl) {
        trackEvent("checkout_started", { method: "whatsapp", order_id: json.orderNumber });
        setWaResult({
          orderNumber: json.orderNumber ?? "",
          whatsappUrl: json.whatsappUrl,
          expiresAt: json.expiresAt ?? "",
          total: localTotal,
          currency: config?.localCurrency ?? "RWF",
          estimate: area?.estimate ?? "1–2 business days",
        });
        clear();
        setSubmitting(false);
        // Open WhatsApp with the pre-filled order summary.
        window.location.assign(json.whatsappUrl);
        return;
      }

      if (json.redirectUrl) {
        window.location.assign(json.redirectUrl);
        return;
      }
      trackEvent("purchase_completed", {
        order_id: json.orderNumber,
        value: total,
        currency,
        contents: lines.map((l) => ({ id: l.sku, quantity: l.quantity, item_price: l.unitPrice })),
      });
      clear();
      router.push(`/checkout/success?order=${json.orderNumber ?? ""}`);
    } catch {
      setServerError("Network error — please try again.");
      setSubmitting(false);
    }
  }

  if (waResult) {
    return (
      <div className="container-rohde flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <p className="label-rohde">Almost done</p>
        <h1 className="heading-rohde mt-3 max-w-xl text-3xl md:text-4xl">
          Finish order #{waResult.orderNumber} on WhatsApp
        </h1>
        <p className="mt-4 max-w-md text-sm text-concrete-dim">
          WhatsApp should have opened with your order summary. Send the message to receive payment
          instructions. Your items are reserved for {config?.reservationMinutes ?? 30} minutes.
        </p>
        {waResult.total > 0 ? (
          <p className="mt-3 font-mono text-sm">
            Order total: {formatPrice(waResult.total, waResult.currency)} · Delivery {waResult.estimate.toLowerCase()}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a href={waResult.whatsappUrl} className="btn-charcoal">
            Reopen WhatsApp
          </a>
          <Link href="/products" className="font-mono text-xs uppercase tracking-wider text-concrete underline-offset-4 hover:text-charcoal hover:underline">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="container-rohde flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <p className="label-rohde">Checkout</p>
        <h1 className="heading-rohde mt-3 text-3xl">Your bag is currently empty.</h1>
        <p className="mt-4 text-sm text-concrete-dim">Add a printed piece to begin.</p>
        <Link href="/products" className="btn-charcoal mt-8">Explore the collection</Link>
      </div>
    );
  }

  const field = (name: string, label: string, opts: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={name} className="label-rohde mb-2 block">{label}</label>
      <input
        id={name}
        name={name}
        className="w-full border border-charcoal/25 bg-transparent px-4 py-3 text-sm placeholder:text-concrete transition-colors duration-300 focus:border-brass focus:outline-none focus-visible:outline-none"
        aria-invalid={fieldErrors[name] ? true : undefined}
        {...opts}
      />
      {fieldErrors[name] ? (
        <p role="alert" className="mt-1.5 font-mono text-[10px] text-error">{fieldErrors[name]}</p>
      ) : null}
    </div>
  );

  return (
    <div className="container-rohde py-14">
      <header className="mb-12">
        <p className="label-rohde">Secure checkout — no account needed</p>
        <h1 className="heading-rohde mt-3 text-4xl md:text-5xl">Checkout</h1>
      </header>

      <div className="grid gap-14 lg:grid-cols-[1.2fr_1fr]">
        <form onSubmit={onSubmit} noValidate aria-label="Checkout">
          <section aria-label="Contact" className="space-y-5">
            <h2 className="label-rohde">01 — Contact</h2>
            {field("email", "Email", { type: "email", autoComplete: "email", required: true })}
            {field("fullName", "Full name", { autoComplete: "name", required: true })}
            {field("phone", "Phone (WhatsApp)", { type: "tel", autoComplete: "tel", required: true, placeholder: "+250 781 214 230" })}
          </section>

          <section aria-label="Delivery details" className="mt-10 space-y-5">
            <h2 className="label-rohde">02 — Delivery</h2>
            {field("line1", "Address line 1", { autoComplete: "address-line1", required: true })}
            {field("line2", "Address line 2 (optional)", { autoComplete: "address-line2" })}
            <div className="grid gap-5 sm:grid-cols-2">
              {field("city", "City", { autoComplete: "address-level2", required: true })}
              {field("region", "Region", { autoComplete: "address-level1" })}
              {field("postalCode", "Postal code", { autoComplete: "postal-code" })}
              {field("country", "Country code", { autoComplete: "country-code", placeholder: "RW", maxLength: 2, required: true })}
            </div>
            {isWa && config ? (
              <>
                <div>
                  <label htmlFor="deliveryArea" className="label-rohde mb-2 block">Delivery area</label>
                  <select
                    id="deliveryArea"
                    name="deliveryArea"
                    value={areaName}
                    onChange={(e) => setAreaName(e.target.value)}
                    className="w-full border border-charcoal/25 bg-transparent px-4 py-3 text-sm transition-colors duration-300 focus:border-brass focus:outline-none"
                    required
                  >
                    {config.deliveryAreas.map((a) => (
                      <option key={a.name} value={a.name}>
                        {a.name} — {formatPrice(a.fee, config.localCurrency)} · {a.estimate}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.deliveryArea ? (
                    <p role="alert" className="mt-1.5 font-mono text-[10px] text-error">{fieldErrors.deliveryArea}</p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="deliveryInstructions" className="label-rohde mb-2 block">Delivery instructions (optional)</label>
                  <textarea
                    id="deliveryInstructions"
                    name="deliveryInstructions"
                    rows={2}
                    maxLength={300}
                    placeholder="Landmark, gate, best time to deliver…"
                    className="w-full border border-charcoal/25 bg-transparent px-4 py-3 text-sm placeholder:text-concrete transition-colors duration-300 focus:border-brass focus:outline-none"
                  />
                </div>
              </>
            ) : null}
          </section>

          <fieldset className="mt-10">
            <legend className="label-rohde">03 — Payment</legend>
            <div className="mt-4 space-y-2">
              {config?.whatsappEnabled ? (
                <label
                  className="flex cursor-pointer items-center gap-4 border border-brass/60 bg-brass/[0.05] px-5 py-3.5 transition-colors duration-300 hover:border-brass has-[:checked]:border-brass has-[:checked]:bg-brass/[0.08]"
                >
                  <input
                    type="radio"
                    name="provider"
                    value="WHATSAPP"
                    checked={provider === "WHATSAPP"}
                    onChange={() => setProvider("WHATSAPP")}
                    className="accent-charcoal"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold uppercase tracking-wide">Mobile Money via WhatsApp</span>
                    <span className="label-rohde mt-0.5 block">MTN · Airtel — pay after chat confirmation</span>
                  </span>
                </label>
              ) : null}
              {CARD_PAYMENTS.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-4 border border-charcoal/20 px-5 py-3.5 transition-colors duration-300 hover:border-brass/60 has-[:checked]:border-brass has-[:checked]:bg-brass/[0.05]"
                >
                  <input
                    type="radio"
                    name="provider"
                    value={p.id}
                    checked={provider === p.id}
                    onChange={() => setProvider(p.id)}
                    className="accent-charcoal"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold uppercase tracking-wide">{p.label}</span>
                    <span className="label-rohde mt-0.5 block">{p.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {serverError ? (
            <p role="alert" className="mt-8 border border-error/40 bg-error/5 px-5 py-4 text-sm text-error">
              {serverError}
            </p>
          ) : null}

          <button type="submit" disabled={submitting} className="btn-charcoal mt-10 w-full !py-4">
            {submitting
              ? "Processing…"
              : isWa
                ? "Complete Order on WhatsApp"
                : `Pay ${formatPrice(total, currency)}`}
          </button>
          {isWa ? (
            <p className="mt-3 text-center font-mono text-[10px] text-concrete">
              WhatsApp opens with your order summary — payment instructions follow in chat.
            </p>
          ) : null}
        </form>

        {/* Order summary */}
        <aside aria-label="Order summary" className="h-fit border border-charcoal/15 p-8 lg:sticky lg:top-24">
          <h2 className="label-rohde">Order summary</h2>
          <ul className="mt-6 divide-y divide-charcoal/10">
            {lines.map((line) => (
              <li key={line.variantId} className="flex items-start justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide">{line.productName}</p>
                  <p className="label-rohde mt-1">{line.color}</p>
                  <p className="label-rohde mt-0.5">Size {line.size} · ×{line.quantity}</p>
                </div>
                <p className="font-mono text-sm">{formatPrice(line.unitPrice * line.quantity, line.currency)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-2 border-t border-charcoal/10 pt-5 font-mono text-sm">
            {isWa && config ? (
              <>
                <div className="flex justify-between">
                  <span className="text-concrete-dim">Subtotal</span>
                  <span>{formatPrice(localSubtotal, config.localCurrency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-concrete-dim">Delivery{area ? ` — ${area.name}` : ""}</span>
                  <span>{formatPrice(area?.fee ?? 0, config.localCurrency)}</span>
                </div>
                <div className="flex justify-between border-t border-charcoal/10 pt-3 text-base font-medium">
                  <span>Total</span>
                  <span>{formatPrice(localTotal, config.localCurrency)}</span>
                </div>
                {area ? (
                  <p className="pt-1 font-mono text-[10px] text-concrete">Estimated delivery: {area.estimate}</p>
                ) : null}
              </>
            ) : (
              <>
                <div className="flex justify-between"><span className="text-concrete-dim">Shipping</span><span>Included</span></div>
                <div className="flex justify-between border-t border-charcoal/10 pt-3 text-base font-medium">
                  <span>Total</span><span>{formatPrice(total, currency)}</span>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
