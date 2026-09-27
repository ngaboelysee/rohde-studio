import Link from "next/link";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Payment Unsuccessful",
  path: "/checkout/failure",
  noIndex: true,
});

type SearchParams = { order?: string; reason?: string };

export default async function CheckoutFailurePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { order, reason } = await searchParams;

  return (
    <div className="container-rohde flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <p className="label-rohde">Payment unsuccessful</p>
      <h1 className="heading-rohde mt-3 text-4xl md:text-5xl">The payment did not go through</h1>
      <p className="mt-6 max-w-md text-sm leading-relaxed text-concrete-dim">
        {reason === "cancelled"
          ? "You cancelled before completion. Your bag is still saved."
          : "The gateway declined the transaction. No money has left your account, and your bag is still saved."}
      </p>
      {order ? (
        <p className="label-rohde mt-4">Reference: {order}</p>
      ) : null}
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/checkout" className="btn-charcoal">Try again</Link>
        <Link href="/products" className="btn-ghost">Back to catalog</Link>
      </div>
    </div>
  );
}
