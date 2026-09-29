/**
 * Minimal sliding-window rate limiter (in-memory per server instance).
 * Good enough to blunt abuse on the WhatsApp webhook and public APIs;
 * a durable limiter (Upstash/Redis) can slot in behind the same interface
 * if traffic grows. Serverless note: instances are ephemeral, so treat
 * this as a soft guard, not a hard guarantee.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    buckets.set(key, arr);
    return { ok: false, retryAfterSec: Math.ceil((windowMs - (now - arr[0]!)) / 1000) };
  }
  arr.push(now);
  buckets.set(key, arr);
  if (buckets.size > 5000) buckets.clear(); // hard memory cap
  return { ok: true, retryAfterSec: 0 };
}
