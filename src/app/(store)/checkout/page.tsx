"use client";

/**
 * Checkout — guest-first, no login required. Validates with Zod, submits to
 * /api/checkout (server re-validates + re-checks inventory), redirects to the
 * gateway or confirmation.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { checkoutSchema } from "@/lib/validation";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/format";
import { trackEvent } from "@/lib/analytics/events";

const PAYMENTS = [
  { id: "MOBILE_MONEY", label: "Mobile Money", hint: "MTN · Airtel" },
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

  const total = subtotal();
  const currency = lines[0]?.currency ?? "USD";

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
      provider: String(fd.get("provider") ?? "STRIPE"),
    };

    const parsed = checkoutSchema.safeParse(raw);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
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
      const json = (await res.json()) as { ok?: boolean; redirectUrl?: string | null; orderNumber?: string; error?: string };

      if (!res.ok || !json.ok) {
        setServerError(json.error ?? "Checkout failed. Please try again.");
        setSubmitting(false);
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
            {field("phone", "Phone", { type: "tel", autoComplete: "tel", required: true, placeholder: "+250 781 214 230" })}
          </section>

          <section aria-label="Shipping address" className="mt-10 space-y-5">
            <h2 className="label-rohde">02 — Shipping</h2>
            {field("line1", "Address line 1", { autoComplete: "address-line1", required: true })}
            {field("line2", "Address line 2 (optional)", { autoComplete: "address-line2" })}
            <div className="grid gap-5 sm:grid-cols-2">
              {field("city", "City", { autoComplete: "address-level2", required: true })}
              {field("region", "Region", { autoComplete: "address-level1" })}
              {field("postalCode", "Postal code", { autoComplete: "postal-code" })}
              {field("country", "Country code", { autoComplete: "country-code", placeholder: "RW", maxLength: 2, required: true })}
            </div>
          </section>

          <fieldset className="mt-10">
            <legend className="label-rohde">03 — Payment</legend>
            <div className="mt-4 space-y-2">
              {PAYMENTS.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-4 border border-charcoal/20 px-5 py-3.5 transition-colors duration-300 hover:border-brass/60 has-[:checked]:border-brass has-[:checked]:bg-brass/[0.05]"
                >
                  <input type="radio" name="provider" value={p.id} defaultChecked={p.id === "STRIPE"} className="accent-charcoal" />
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
            {submitting ? "Processing…" : `Pay ${formatPrice(total, currency)}`}
          </button>
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
            <div className="flex justify-between"><span className="text-concrete-dim">Shipping</span><span>Included</span></div>
            <div className="flex justify-between border-t border-charcoal/10 pt-3 text-base font-medium">
              <span>Total</span><span>{formatPrice(total, currency)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
