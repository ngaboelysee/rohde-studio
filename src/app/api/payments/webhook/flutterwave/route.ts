/**
 * Flutterwave webhook — verifies the `verif-hash` header matches the secret
 * hash configured in the Flutterwave dashboard. Covers card + Mobile Money.
 */
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { env } from "@/lib/env";
import { fulfillOrderFromWebhook, markOrderFailed } from "@/lib/payments/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

type FlutterwaveEvent = {
  event?: string;
  data?: {
    tx_ref?: string;
    id?: number;
    amount?: number;
    currency?: string;
    status?: string;
  };
};

export async function POST(req: Request): Promise<NextResponse> {
  const receivedHash = req.headers.get("verif-hash") ?? "";
  if (!receivedHash || !safeEqual(receivedHash, env.FLUTTERWAVE_SECRET_HASH)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const body = (await req.json()) as FlutterwaveEvent;

  if (body.data?.status === "successful" && body.data.tx_ref) {
    await fulfillOrderFromWebhook({
      orderNumber: body.data.tx_ref,
      provider: "FLUTTERWAVE",
      providerRef: String(body.data.id ?? body.data.tx_ref),
      eventId: `flw_${body.data.id ?? body.data.tx_ref}`,
      amount: body.data.amount,
      currency: body.data.currency,
    });
  } else if (body.data?.status && ["failed", "cancelled"].includes(body.data.status)) {
    await markOrderFailed({
      orderNumber: body.data.tx_ref ?? "",
      provider: "FLUTTERWAVE",
      eventId: `flw_${body.data.id ?? body.data.tx_ref}`,
      reason: `Flutterwave reported ${body.data.status}`,
    });
  }

  return NextResponse.json({ received: true });
}
