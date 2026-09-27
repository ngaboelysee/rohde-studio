import { NextResponse } from "next/server";
import { destroyAdminSession } from "@/lib/admin-session";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  await destroyAdminSession();
  return NextResponse.redirect(new URL("/admin/login", req.url), { status: 303 });
}
