/**
 * API helpers. Admin API endpoints respond with a standard 404 (never 403)
 * so the existence of admin surface area is never revealed.
 */
import "server-only";
import { NextResponse } from "next/server";
import { getAdminSession, type AdminSession } from "@/lib/admin-session";

export function notFoundResponse(): NextResponse {
  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

export function serverError(): NextResponse {
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

type AdminRequest = Request & { session: AdminSession };

/** Wrap an admin API handler; returns an obfuscated 404 unless the caller is staff. */
export function withAdminGuard(
  handler: (req: AdminRequest) => Promise<NextResponse>
): (req: Request) => Promise<NextResponse> {
  return async (req: Request): Promise<NextResponse> => {
    const session = await getAdminSession();
    if (!session) return notFoundResponse();
    try {
      const adminReq = req as AdminRequest;
      adminReq.session = session;
      return await handler(adminReq);
    } catch (error) {
      console.error("[admin api]", error);
      return serverError();
    }
  };
}
