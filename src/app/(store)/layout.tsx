import "../globals.css";
import type { Metadata, Viewport } from "next";
import { SITE } from "@/lib/seo";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { ShaderBackdrop } from "@/components/motion/ShaderBackdrop";
import { Concierge } from "@/components/concierge/Concierge";
import { MagneticField } from "@/components/motion/MagneticField";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Rohde — Objects of Orbit",
    template: "%s — Rohde",
  },
  description: SITE.description,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: "Rohde — Objects of Orbit",
    description: SITE.description,
    images: ["/og"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0B",
  width: "device-width",
  initialScale: 1,
};

/** Storefront chrome — wraps ONLY customer-facing routes. */
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ShaderBackdrop />
      <MagneticField />
      <Header />
      <main id="main-content">{children}</main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton />
      <Concierge />
      <AnalyticsProvider />
    </>
  );
}
