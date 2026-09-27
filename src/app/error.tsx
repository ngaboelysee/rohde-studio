"use client";

import Link from "next/link";
import { useEffect } from "react";
import { OrbitLogo } from "@/components/brand/OrbitLogo";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[rohde] application error", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="text-concrete/50">
        <OrbitLogo size={80} />
      </div>
      <p className="label-rohde mt-9">Error 500</p>
      <h1 className="heading-rohde mt-3 text-4xl md:text-6xl">Signal interrupted</h1>
      <p className="mt-6 max-w-md text-sm leading-relaxed text-concrete-dim">
        Something went wrong on our side. Try again in a moment.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn-charcoal">Try again</button>
        <Link href="/" className="btn-ghost">Return home</Link>
      </div>
    </div>
  );
}
