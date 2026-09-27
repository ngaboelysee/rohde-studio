import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sanitizeEmail, sanitizeText } from "@/lib/sanitize";

const schema = z.object({ email: z.string().trim().email().max(320) });

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const email = sanitizeEmail(parsed.data.email);
    await prisma.user.upsert({
      where: { email },
      update: { marketingOptIn: true },
      create: {
        // Newsletter-only subscribers get a placeholder identity until they
        // register; email stays unique so the row is claimable later.
        email,
        name: sanitizeText(email.split("@")[0] ?? "Subscriber", 80),
        marketingOptIn: true,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[newsletter]", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
