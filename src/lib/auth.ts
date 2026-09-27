/**
 * CUSTOMER authentication — Auth.js / NextAuth v4.
 * JWT sessions in secure, HTTP-only cookies. Customers never touch Supabase.
 */
import "server-only";
import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sanitizeEmail } from "@/lib/sanitize";

export const authOptions: NextAuthOptions = {
  // PrismaAdapter for profile persistence; JWT strategy so sessions ride in
  // signed, HTTP-only cookies without a session table round-trip.
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: {
    signIn: "/account/login",
    error: "/account/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const email = sanitizeEmail(credentials.email);
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user?.passwordHash) return null;
          const valid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!valid) return null;
          return { id: user.id, email: user.email, name: user.name, image: user.image };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-rohde.session-token"
          : "rohde.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  // Customer auth never exposes admin/debug pages
  debug: false,
};

/** Server-side helper: current customer or null. */
export async function getCustomer() {
  const { getServerSession } = await import("next-auth");
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export async function requireCustomer() {
  const customer = await getCustomer();
  if (!customer?.id) throw new Error("UNAUTHENTICATED");
  return customer;
}
