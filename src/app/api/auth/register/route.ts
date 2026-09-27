import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { sanitizeEmail, sanitizeText } from "@/lib/sanitize";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid registration details", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const email = sanitizeEmail(parsed.data.email);
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await prisma.user.create({
      data: {
        email,
        name: sanitizeText(parsed.data.name, 80),
        passwordHash,
        marketingOptIn: parsed.data.marketingOptIn ?? false,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[register]", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
