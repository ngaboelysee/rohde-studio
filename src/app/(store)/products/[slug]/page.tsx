import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getProductBySlug } from "@/lib/catalog";
import { pageMetadata, productMetadata } from "@/lib/seo";
import { ProductDetail } from "@/components/product/ProductDetail";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return pageMetadata({ title: "Not Found", noIndex: true });
  return productMetadata({
    name: product.name,
    slug: product.slug,
    description: product.description,
    images: [],
    currency: product.currency,
    basePrice: product.basePrice,
  });
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <Suspense
      fallback={
        <div aria-busy="true" className="container-rohde grid gap-10 py-10 lg:grid-cols-2">
          <div className="aspect-[4/5] animate-pulse bg-bone-deep" aria-hidden="true" />
          <div className="space-y-6 py-6" aria-hidden="true">
            <div className="h-4 w-24 animate-pulse bg-bone-deep" />
            <div className="h-12 w-3/4 animate-pulse bg-bone-deep" />
            <div className="h-24 w-full animate-pulse bg-bone-deep" />
          </div>
        </div>
      }
    >
      <ProductDetail product={product} />
    </Suspense>
  );
}
