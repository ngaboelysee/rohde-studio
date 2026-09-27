import Link from "next/link";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <article className="container-rohde max-w-2xl pb-28 pt-16 md:pt-24">
      <p className="label-rohde">Legal</p>
      <h1 className="heading-rohde mt-4 text-3xl md:text-4xl">Terms</h1>
      <div className="mt-10 space-y-6 text-sm leading-loose text-concrete-dim">
        <p>
          All pieces are printed to order in Kigali. Each drop is a numbered
          run; when a run is gone, it is gone. Custom prints are one-of-one and
          non-returnable unless faulty.
        </p>
        <p>
          Standard pieces may be returned unworn within 14 days of delivery —
          contact the studio line first on WhatsApp (+250 781 214 230) or by
          email to arrange it. Shipping costs on returns are the customer's
          unless the piece arrived faulty.
        </p>
        <p>
          Prices are shown in USD; regional gateways may settle in local
          currency at the rate shown at checkout.
        </p>
      </div>
      <Link href="/" className="link-brass mt-12 inline-block text-sm text-concrete-dim">
        ← Return home
      </Link>
    </article>
  );
}
