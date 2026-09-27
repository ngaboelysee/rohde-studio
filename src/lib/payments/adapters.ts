/**
 * Payment provider adapters. Each adapter returns a hosted-checkout style
 * redirect or a client-handoff payload; verification always happens via
 * webhook signature, never by trusting the redirect.
 */
import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";
import type { PaymentProvider } from "@prisma/client";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" });
  }
  return stripeClient;
}

export type InitPaymentInput = {
  provider: PaymentProvider;
  orderNumber: string;
  email: string;
  amount: number; // major units
  currency: string;
  lines: { name: string; unitPrice: number; quantity: number }[];
  origin: string;
};

export type InitPaymentResult = {
  redirectUrl: string | null; // hosted redirect (Paystack/Flutterwave)
  clientSecret: null; // reserved for future Stripe Elements flow
};

export async function initProviderPayment(
  input: InitPaymentInput
): Promise<InitPaymentResult> {
  switch (input.provider) {
    case "STRIPE":
      return initStripe(input);
    case "PAYSTACK":
      return initPaystack(input);
    case "FLUTTERWAVE":
      return initFlutterwave(input);
    case "MOBILE_MONEY":
      // Mobile Money rides the Flutterwave rails in every supported corridor.
      return initFlutterwave(input);
    default: {
      const never: never = input.provider;
      throw new Error(`Unsupported provider: ${never}`);
    }
  }
}

async function initStripe(input: InitPaymentInput): Promise<InitPaymentResult> {
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: input.email,
    line_items: input.lines.map((line) => ({
      price_data: {
        currency: input.currency.toLowerCase(),
        product_data: { name: line.name },
        unit_amount: Math.round(line.unitPrice * 100),
      },
      quantity: line.quantity,
    })),
    metadata: { orderNumber: input.orderNumber },
    success_url: `${input.origin}/checkout/success?order=${input.orderNumber}&provider=STRIPE`,
    cancel_url: `${input.origin}/checkout/failure?order=${input.orderNumber}&reason=cancelled`,
  });
  return { redirectUrl: session.url, clientSecret: null };
}

async function initPaystack(input: InitPaymentInput): Promise<InitPaymentResult> {
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: Math.round(input.amount * 100), // kobo
      currency: input.currency,
      reference: input.orderNumber,
      metadata: { orderNumber: input.orderNumber },
      callback_url: `${input.origin}/checkout/success?order=${input.orderNumber}&provider=PAYSTACK`,
    }),
  });
  const json = (await res.json()) as {
    status: boolean;
    message?: string;
    data?: { authorization_url: string };
  };
  if (!res.ok || !json.status || !json.data) {
    throw new Error(json.message ?? "Paystack init failed");
  }
  return { redirectUrl: json.data.authorization_url, clientSecret: null };
}

async function initFlutterwave(input: InitPaymentInput): Promise<InitPaymentResult> {
  const isMobileMoney = input.provider === "MOBILE_MONEY";
  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.FLUTTERWAVE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: input.orderNumber,
      amount: input.amount,
      currency: input.currency,
      redirect_url: `${input.origin}/checkout/success?order=${input.orderNumber}&provider=${input.provider}`,
      customer: { email: input.email },
      meta: { orderNumber: input.orderNumber },
      payment_options: isMobileMoney ? "mobilemoneyghana,mobilemoneykenya,mobilemoneyuganda" : "card",
    }),
  });
  const json = (await res.json()) as {
    status: string;
    message?: string;
    data?: { link: string };
  };
  if (!res.ok || json.status !== "success" || !json.data) {
    throw new Error(json.message ?? "Flutterwave init failed");
  }
  return { redirectUrl: json.data.link, clientSecret: null };
}
