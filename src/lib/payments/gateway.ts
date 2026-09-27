/**
 * Payment gateway router — picks the provider by customer location.
 * All secrets stay server-side; the storefront only ever receives a
 * redirect/checkout URL or client-side flow id.
 */
import "server-only";
import { env } from "@/lib/env";
import type { PaymentProvider } from "@prisma/client";

export type GatewayContext = {
  country: string; // ISO 3166-1 alpha-2
  currency: string;
  total: number;
  email: string;
};

const MOBILE_MONEY_COUNTRIES = new Set(["GH", "KE", "UG", "TZ", "CI", "SN"]);

/** Stripe handles cards globally; Paystack/Flutterwave cover African corridors. */
export function selectGateway(ctx: GatewayContext): PaymentProvider {
  const c = ctx.country.toUpperCase();

  if (MOBILE_MONEY_COUNTRIES.has(c)) return "MOBILE_MONEY";

  if (["NG", "GH", "ZA", "KE"].includes(c)) {
    return c === "NG" ? "PAYSTACK" : "FLUTTERWAVE";
  }

  return "STRIPE";
}

/** Preferred currency per provider; used to warn on mismatched corridors. */
export function gatewayCurrencyAllowed(provider: PaymentProvider, currency: string): boolean {
  switch (provider) {
    case "STRIPE":
      return ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"].includes(currency);
    case "PAYSTACK":
      return ["NGN", "USD", "GHS", "ZAR"].includes(currency);
    case "FLUTTERWAVE":
      return ["NGN", "USD", "GHS", "KES", "ZAR", "XOF"].includes(currency);
    case "MOBILE_MONEY":
      return ["GHS", "KES", "UGX", "TZS", "XOF"].includes(currency);
    default:
      return false;
  }
}

/** Convert a USD catalog price to a local corridor currency (static demo rates). */
export function demoConvert(usd: number, currency: string): number {
  const rates: Record<string, number> = {
    USD: 1, EUR: 0.92, GBP: 0.79, NGN: 1550, GHS: 15.2,
    KES: 129, ZAR: 18.2, UGX: 3800, TZS: 2700, XOF: 605,
  };
  return Math.round(usd * (rates[currency] ?? 1) * 100) / 100;
}

/** Expose only publishable data to the client. */
export function publicGatewayConfig() {
  return {
    stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null,
  };
}
