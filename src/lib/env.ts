/**
 * Rohde — server-only environment contract.
 * Fails fast if a required secret is missing or malformed. Nothing in this
 * file may be imported from a client component ("import "server-only").
 */
import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),

  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(16),

  // Supabase — admin auth + storage only
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ADMIN_SIGNUP_INVITE_CODE: z.string().min(1),

  // Payment gateways
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  PAYSTACK_SECRET_KEY: z.string().min(1),
  FLUTTERWAVE_SECRET_KEY: z.string().min(1),
  FLUTTERWAVE_SECRET_HASH: z.string().min(1),

  // Public measurement IDs (safe to expose, validated here for presence)
  NEXT_PUBLIC_GA4_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_META_PIXEL_ID: z.string().optional(),
  NEXT_PUBLIC_TIKTOK_PIXEL_ID: z.string().optional(),

  // Atelier Concierge (AI chatbot via OpenRouter) — optional, degrades
  // gracefully to a human-handoff reply when unset or empty.
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
});

const parsed = serverEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:\n" +
      parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")
  );
  throw new Error("Invalid environment variables — check server logs.");
}

export const env = parsed.data;
