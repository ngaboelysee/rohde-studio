/**
 * Public store configuration — the ONLY place the storefront reads
 * WhatsApp/mobile-money settings from. Serves the sanitized projection
 * (delivery areas, currency rate, reservation window). No secrets: the
 * receiving MoMo account name/number are delivered by the bot in-chat,
 * never baked into frontend bundles or this response.
 */
import { NextResponse } from "next/server";
import { getStoreSettings, publicStoreConfig } from "@/lib/store-settings";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const settings = await getStoreSettings();
  return NextResponse.json(
    { config: publicStoreConfig(settings) },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } }
  );
}
