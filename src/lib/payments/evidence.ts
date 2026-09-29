/**
 * Payment evidence extraction — parses a customer-pasted mobile-money
 * confirmation SMS into structured fields. IMPORTANT: the result is
 * *evidence only*. It is never treated as proof of payment; every field
 * exists solely to be checked against a trusted merchant-side record by
 * the verification engine.
 */

export type PaymentEvidence = {
  provider: string | null; // mtn | airtel | eKash | unknown
  transactionId: string | null;
  amount: number | null;
  currency: string | null;
  senderPhone: string | null;
  receiverPhone: string | null;
  datetime: Date | null;
  /** Raw message (truncated) for the admin audit trail. */
  rawSnippet: string;
};

const AMOUNT_RE =
  /(?:rwf|frw|ugx|tzs|kes|ghs|ngn|usd)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)|([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:rwf|frw|ugx|tzs|kes|ghs|ngn|usd)/i;
const TXID_RE =
  /\b(?:id|txid|tx id|ref|reference|transaction id|transaction)[:\s]*([A-Z0-9][A-Z0-9.\-]{5,30})\b|\b([0-9]{8,12}\.[A-Z0-9]{4,8}\.[A-Z0-9]{4,8})\b/i;
const PHONE_RE = /\b(?:\+?250|0)7[0-9]{8}\b|\b\+?[0-9]{10,15}\b/g;
const DATE_RE =
  /\b(\d{4}-\d{2}-\d{2})[T ]?(\d{2}:\d{2}(?::\d{2})?)?\b|\b(\d{1,2}\/\d{1,2}\/\d{2,4})[ ,]*(\d{1,2}:\d{2}(?:(?::| )\d{2})?)?\b/i;

function detectProvider(text: string): string | null {
  const t = text.toLowerCase();
  if (/mtn|momo\s*|mobile money/.test(t)) return "mtn";
  if (/airtel\s*money|airtel/.test(t)) return "airtel";
  if (/ekash|e-kash/.test(t)) return "ekash";
  if (/bk|bank kigali|card|visa|mastercard/.test(t)) return "bank";
  return null;
}

function parseAmount(text: string): { amount: number; currency: string } | null {
  const m = text.match(AMOUNT_RE);
  if (!m) return null;
  const raw = (m[1] ?? m[2] ?? "").replace(/,/g, "");
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const curMatch = text.match(/rwf|frw|ugx|tzs|kes|ghs|ngn|usd/i);
  return { amount, currency: (curMatch?.[0] ?? "RWF").toUpperCase().replace("FRW", "RWF") };
}

function parseDate(text: string): Date | null {
  const m = text.match(DATE_RE);
  if (!m) return null;
  if (m[1]) {
    const d = new Date(m[1] + (m[2] ? `T${m[2]}` : "T00:00:00"));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (m[3]) {
    const d = new Date(m[3] + (m[4] ? ` ${m[4]}` : ""));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function extractPaymentEvidence(message: string): PaymentEvidence {
  const text = (message || "").slice(0, 4000);
  const amount = parseAmount(text);
  const txidMatch = text.match(TXID_RE);
  const phones = Array.from(new Set(text.match(PHONE_RE) ?? [])).map((p) => p.replace(/\D/g, ""));

  return {
    provider: detectProvider(text),
    transactionId: (txidMatch?.[1] ?? txidMatch?.[2] ?? null)?.toUpperCase() ?? null,
    amount: amount?.amount ?? null,
    currency: amount?.currency ?? null,
    senderPhone: phones[0] ?? null,
    receiverPhone: phones.length > 1 ? (phones[phones.length - 1] ?? null) : null,
    datetime: parseDate(text),
    rawSnippet: text.slice(0, 500),
  };
}
