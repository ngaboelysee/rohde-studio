/**
 * MTN MoMo Collection API adapter — server-side transaction lookup.
 * Used by the verification engine to confirm that a mobile-money payment
 * actually exists on the merchant account. Credentials live only in env
 * vars; when they are absent the adapter reports "unconfigured" and the
 * engine falls back to Under Review (never auto-approval).
 *
 * Env:
 *   MOMO_SUBSCRIPTION_KEY    — Ocp-Apim-Subscription-Key
 *   MOMO_API_USER / MOMO_API_KEY — Basic auth for the token endpoint
 *   MOMO_BASE_URL            — https://sandbox.momodeveloper.mtn.com (default)
 *                              or https://proxy.momoapi.mtn.com (live)
 *   MOMO_TARGET_ENV          — "sandbox" or "production"
 */
import "server-only";

const BASE = process.env.MOMO_BASE_URL ?? "https://sandbox.momodeveloper.mtn.com";
const SUBSCRIPTION_KEY = process.env.MOMO_SUBSCRIPTION_KEY ?? "";
const API_USER = process.env.MOMO_API_USER ?? "";
const API_KEY = process.env.MOMO_API_KEY ?? "";
const TARGET_ENV = process.env.MOMO_TARGET_ENV ?? "sandbox";

export function momoConfigured(): boolean {
  return Boolean(SUBSCRIPTION_KEY && API_USER && API_KEY);
}

let tokenCache: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) return tokenCache.token;
  const res = await fetch(`${BASE}/collection/token/`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": SUBSCRIPTION_KEY,
      Authorization: `Basic ${Buffer.from(`${API_USER}:${API_KEY}`).toString("base64")}`,
    },
  });
  if (!res.ok) throw new Error(`momo token failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return tokenCache.token;
}

export type MoMoTxStatus = {
  found: boolean;
  status: "SUCCESSFUL" | "PENDING" | "FAILED" | string;
  amount: number | null;
  currency: string | null;
  financialTransactionId: string | null;
  externalId: string | null;
  payerPhone: string | null;
  raw: unknown;
};

/**
 * Look up a collection transaction by its referenceId (the UUID the merchant
 * generated when initiating the request-to-pay). For customer-initiated
 * transfers to a merchant number, use lookupByExternalId with the order
 * number as externalId.
 */
export async function momoGetCollection(referenceId: string): Promise<MoMoTxStatus | null> {
  if (!momoConfigured()) return null;
  const token = await accessToken();
  const res = await fetch(`${BASE}/collection/v1_0/requesttopay/${referenceId}`, {
    headers: {
      "Ocp-Apim-Subscription-Key": SUBSCRIPTION_KEY,
      Authorization: `Bearer ${token}`,
      "X-Target-Environment": TARGET_ENV,
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`momo lookup failed: ${res.status}`);
  const raw = (await res.json()) as Record<string, unknown>;
  return {
    found: true,
    status: (raw.status as string) ?? "UNKNOWN",
    amount: raw.amount != null ? Number(raw.amount) : null,
    currency: (raw.currency as string) ?? null,
    financialTransactionId: (raw.financialTransactionId as string) ?? null,
    externalId: (raw.externalId as string) ?? null,
    payerPhone: (raw.payer as { partyId?: string } | undefined)?.partyId ?? null,
    raw,
  };
}
