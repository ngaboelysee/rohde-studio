import "../globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "Rohde · Studio", template: "%s — Rohde" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0B",
  width: "device-width",
  initialScale: 1,
};

/**
 * Admin root — deliberately chrome-free. The storefront Header, Footer,
 * Concierge and WhatsApp button live in the (store) group layout, so they
 * can never render above admin content again.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
