/**
 * Stripe webhook — verifies the `stripe-signature` header against the RAW
 * request body before any state change. Never trust parsed JSON.
 */
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/payments/adapters";
import { env } from "@/lib/env";
import { fulfillOrderFromWebhook, markOrderFailed } from "@/lib/payments/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const raw = await req.text(); // raw body — required for signature check

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const orderNumber = session.metadata?.orderNumber;
      if (!orderNumber) break;

      if (session.payment_status === "paid") {
        await fulfillOrderFromWebhook({
          orderNumber,
          provider: "STRIPE",
          providerRef: session.id,
          eventId: `stripe_${event.id}`,
          amount: (session.amount_total ?? 0) / 100,
          currency: (session.currency ?? "usd").toUpperCase(),
        });
      }
      break;
    }
    case "checkout.session.async_payment_failed":
    case "payment_intent.payment_failed": {
      const obj = event.data.object as Stripe.PaymentIntent | Stripe.Checkout.Session;
      const orderNumber =
        ("metadata" in obj ? obj.metadata?.orderNumber : undefined) ?? undefined;
      if (orderNumber) {
        await markOrderFailed({
          orderNumber,
          provider: "STRIPE",
          eventId: `stripe_${event.id}`,
          reason: "Stripe reported a failed payment",
        });
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
