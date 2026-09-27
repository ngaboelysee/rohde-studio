/**
 * Paystack webhook — `x-paystack-signature` is HMAC-SHA512 of the raw body
 * using the secret key. Verify before parsing/acting.
 */
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";
import { fulfillOrderFromWebhook, markOrderFailed } from "@/lib/payments/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifyPaystackSignature(raw: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(raw).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

type PaystackEvent = {
  event: string;
  data: {
    reference?: string;
    amount?: number; // kobo
    currency?: string;
    id?: number;
  };
};

export async function POST(req: Request): Promise<NextResponse> {
  const raw = await req.text();
  if (!verifyPaystackSignature(raw, req.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let body: PaystackEvent;
  try {
    body = JSON.parse(raw) as PaystackEvent;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (body.event === "charge.success" && body.data?.reference) {
    await fulfillOrderFromWebhook({
      orderNumber: body.data.reference,
      provider: "PAYSTACK",
      providerRef: body.data.reference,
      eventId: `paystack_${body.data.id ?? body.data.reference}`,
      amount: (body.data.amount ?? 0) / 100,
      currency: body.data.currency,
    });
  } else if (body.event === "charge.failed") {
    await markOrderFailed({
      orderNumber: body.data?.reference ?? "",
      provider: "PAYSTACK",
      eventId: `paystack_${body.data?.id ?? Date.now()}`,
      reason: "Paystack reported a failed charge",
    });
  }

  return NextResponse.json({ received: true });
}
