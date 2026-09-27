import Link from "next/link";
import { OrbitLogo } from "@/components/brand/OrbitLogo";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="text-concrete/50">
        <OrbitLogo size={80} />
      </div>
      <p className="label-rohde mt-9">Error 404</p>
      <h1 className="heading-rohde mt-3 text-4xl md:text-6xl">Position lost in orbit</h1>
      <p className="mt-6 max-w-md text-sm leading-relaxed text-concrete-dim">
        The page you requested has drifted out of range.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-charcoal">Return home</Link>
        <Link href="/products" className="btn-ghost">Browse catalog</Link>
      </div>
    </div>
  );
}
