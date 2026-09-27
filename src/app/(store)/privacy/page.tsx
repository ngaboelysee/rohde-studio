import Link from "next/link";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <article className="container-rohde max-w-2xl pb-28 pt-16 md:pt-24">
      <p className="label-rohde">Legal</p>
      <h1 className="heading-rohde mt-4 text-3xl md:text-4xl">Privacy</h1>
      <div className="mt-10 space-y-6 text-sm leading-loose text-concrete-dim">
        <p>
          Rohde collects only what an order requires: contact details, delivery
          address, and payment confirmation. Payment data is handled entirely by
          the payment provider — the studio never sees card numbers.
        </p>
        <p>
          Order records are kept as long as Rwandan commercial law requires.
          Analytics, when enabled, are anonymized. Nothing is sold or shared
          beyond what fulfilment requires.
        </p>
        <p>
          Questions about your data:{" "}
          <a href="mailto:rakininkubito@gmail.com" className="text-charcoal underline underline-offset-4 hover:text-brass">
            rakininkubito@gmail.com
          </a>
          .
        </p>
      </div>
      <Link href="/" className="link-brass mt-12 inline-block text-sm text-concrete-dim">
        ← Return home
      </Link>
    </article>
  );
}
