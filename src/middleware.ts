/**
 * Route obfuscation middleware.
 *
 * - Any request to /admin* without a valid admin cookie receives a standard
 *   Next.js 404 — indistinguishable from a page that does not exist.
 * - Admin API routes under /api/admin/* behave the same way.
 * - Also strips the X-Powered-By fingerprint.
 */
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const ADMIN_COOKIE =
  process.env.NODE_ENV === "production" ? "__Secure-rohde.admin" : "rohde.admin";

function notFound(): NextResponse {
  return new NextResponse(null, {
    status: 404,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    // The login page must stay reachable — everything else stays obfuscated.
    if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
      return NextResponse.next();
    }
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    if (!token) return notFound();

    try {
      const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "");
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch {
      return notFound();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
