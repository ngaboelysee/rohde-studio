/**
 * WhatsApp Cloud API webhook.
 *
 * GET  /api/webhooks/whatsapp  → Meta subscription handshake
 *      (hub.mode=subscribe & hub.verify_token === WHATSAPP_VERIFY_TOKEN)
 * POST /api/webhooks/whatsapp  → inbound messages → conversation engine
 *
 * Security:
 * - POST verifies the X-Hub-Signature-256 HMAC (WHATSAPP_APP_SECRET) when
 *   configured, before parsing the body.
 * - Per-sender rate limiting absorbs floods.
 * - Always 200 to Meta (non-200s trigger retries/dedup complexity); errors
 *   are logged server-side instead.
 */
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { handleIncomingMessage } from "@/lib/whatsapp-bot";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // not configured yet — bot only logs replies anyway
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signatureHeader.slice("sha256=".length);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(received, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge") ?? "";

  if (mode === "subscribe" && token && token === (process.env.WHATSAPP_VERIFY_TOKEN ?? "")) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

type WaWebhookBody = {
  entry?: {
    changes?: {
      value?: {
        messages?: { from?: string; text?: { body?: string }; type?: string }[];
        contacts?: { profile?: { name?: string } }[];
      };
    }[];
  }[];
};

export async function POST(req: Request): Promise<NextResponse> {
  const raw = await req.text();

  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"))) {
    console.warn("[wa-webhook] invalid signature");
    return NextResponse.json({ ok: true }); // don't leak validation state
  }

  let body: WaWebhookBody;
  try {
    body = JSON.parse(raw) as WaWebhookBody;
  } catch {
    return NextResponse.json({ ok: true });
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const message = value?.messages?.[0];
      if (!message?.from || message.type !== "text") continue;

      const phone = message.from;
      const limiter = rateLimit(`wa-inbox:${phone}`, 12, 60_000);
      if (!limiter.ok) {
        console.warn("[wa-webhook] rate-limited", phone);
        continue;
      }

      try {
        await handleIncomingMessage({
          fromPhone: phone,
          text: message.text?.body ?? "",
          profileName: value?.contacts?.[0]?.profile?.name,
        });
      } catch (err) {
        console.error("[wa-webhook] handler failed", err);
      }
    }
  }

  // Always acknowledge so Meta doesn't retry-storm.
  return NextResponse.json({ ok: true });
}
