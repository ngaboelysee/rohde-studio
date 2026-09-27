/**
 * Rohde SEO / metadata factory — branded OG + Twitter cards for WhatsApp,
 * Instagram DMs, X, and iMessage previews.
 */
import type { Metadata } from "next";

export const SITE = {
  name: "Rohde",
  tagline: "Objects of Orbit",
  description:
    "Rohde is a luxury fashion house blending industrial streetwear with minimalist editorial design. Explore the ORBIT 001 collection.",
  url: process.env.NEXTAUTH_URL ?? "https://rohde.store",
  twitter: "@rohde",
} as const;

export function pageMetadata(options: {
  title: string;
  description?: string;
  path?: string;
  images?: string[];
  noIndex?: boolean;
}): Metadata {
  const { title, description = SITE.description, path = "/", images = [], noIndex } = options;
  const url = `${SITE.url}${path}`;
  const ogImages = images.length > 0 ? images : [`${SITE.url}/og`];

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} — Rohde`,
      description,
      url,
      siteName: SITE.name,
      type: "website",
      images: ogImages.map((src) => ({ url: src, width: 1200, height: 630, alt: `${title} — Rohde` })),
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitter,
      title: `${title} — Rohde`,
      description,
      images: ogImages,
    },
    robots: noIndex ? { index: false, follow: false } : undefined,
  };
}

export function productMetadata(product: {
  name: string;
  slug: string;
  description: string;
  images: string[];
  currency: string;
  basePrice: string | number;
}): Metadata {
  const url = `${SITE.url}/products/${product.slug}`;
  const image = product.images[0] ?? `${SITE.url}/og`;

  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${product.name} — Rohde`,
      description: product.description,
      url,
      siteName: SITE.name,
      type: "website",
      images: [{ url: image, width: 1200, height: 1500, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitter,
      title: `${product.name} — Rohde`,
      description: product.description,
      images: [image],
    },
    other: {
      "product:price:amount": String(product.basePrice),
      "product:price:currency": product.currency,
    },
  };
}
