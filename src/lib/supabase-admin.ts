/**
 * Supabase clients — ADMIN ONLY.
 * - `supabaseAdmin` uses the service-role key: server-side only, used to
 *   verify staff credentials, manage admin users, and sign storage URLs.
 * - `supabaseBrowser` uses the anon key: used by the admin login form only.
 * Customer routes never import this module.
 */
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let adminClient: SupabaseClient | null = null;

/** Server-side service-role client (never shipped to the browser). */
export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

export function getSupabaseBrowser(): SupabaseClient {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}
