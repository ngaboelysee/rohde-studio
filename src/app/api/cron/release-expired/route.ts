/**
 * Cron: release expired WhatsApp reservations (daily sweep).
 *
 * The primary expiry mechanism is LAZY: /api/checkout calls
 * releaseExpiredReservations() before asserting stock, so availability is
 * always accurate at the moment a new order reserves items. Vercel Hobby
 * only permits daily crons, so this endpoint is a once-a-day janitor that
 * flips long-expired orders to FAILED for clean admin reporting.
 *
 * Protected by CRON_SECRET (Vercel Cron sends it as a Bearer token).
 */
import { NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/lib/inventory";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    const url = new URL(req.url);
    const provided = auth.replace(/^Bearer /i, "") || url.searchParams.get("secret") || "";
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const released = await releaseExpiredReservations();
    return NextResponse.json({ ok: true, released });
  } catch (err) {
    console.error("[cron] release-expired failed", err);
    return NextResponse.json({ error: "Sweep failed" }, { status: 500 });
  }
}
