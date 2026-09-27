"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useCartStore } from "@/stores/cart-store";
import { trackEvent } from "@/lib/analytics/events";
import { OrbitLogo } from "@/components/brand/OrbitLogo";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") ?? "";
  const clear = useCartStore((s) => s.clear);
  const lines = useCartStore((s) => s.lines);
  const subtotal = useCartStore((s) => s.subtotal);
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    trackEvent("purchase_completed", {
      order_id: orderNumber,
      value: subtotal(),
      currency: lines[0]?.currency ?? "USD",
      contents: lines.map((l) => ({ id: l.sku, quantity: l.quantity, item_price: l.unitPrice })),
    });
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container-rohde flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <div className="text-charcoal">
        <OrbitLogo size={64} />
      </div>
      <p className="label-rohde mt-8">Order confirmed</p>
      <h1 className="heading-rohde mt-3 text-4xl md:text-5xl">Thank you.</h1>
      {orderNumber ? (
        <p className="mt-6 font-mono text-sm text-concrete-dim">
          Order <span className="font-medium text-charcoal">{orderNumber}</span> — confirmation sent to your email.
        </p>
      ) : null}
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/products" className="btn-charcoal">Continue shopping</Link>
        <Link href="/" className="btn-ghost">Home</Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
