/**
 * Admin login API — verifies staff credentials through Supabase Auth and
 * issues the admin session cookie. Failures return the same generic error
 * whether the account exists or not (no enumeration).
 */
import { NextResponse } from "next/server";
import { adminLoginSchema } from "@/lib/validation";
import { verifyAdminCredentials } from "@/lib/admin-auth";
import { createAdminSession } from "@/lib/admin-session";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => null);
    const parsed = adminLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const session = await verifyAdminCredentials(parsed.data);
    if (!session) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await createAdminSession(session);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin login]", error);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
}
