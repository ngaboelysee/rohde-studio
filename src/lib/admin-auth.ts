/**
 * Admin authentication service — verifies staff credentials through Supabase
 * Auth (service role), syncs the local AdminUser registry, and journals
 * every privileged action into AdminAuditLog.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { env } from "@/lib/env";
import { sanitizeEmail, sanitizeText } from "@/lib/sanitize";
import type { AdminSession } from "@/lib/admin-session";

export async function verifyAdminCredentials(input: {
  email: string;
  password: string;
  inviteCode?: string;
}): Promise<AdminSession | null> {
  const email = sanitizeEmail(input.email);
  const supabase = getSupabaseAdmin();

  // First-ever bootstrap: an invite code gates creation of the initial OWNER.
  const registryCount = await prisma.adminUser.count();
  if (registryCount === 0) {
    if (input.inviteCode !== env.ADMIN_SIGNUP_INVITE_CODE) return null;
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
    });
    if (error || !data.user) return null;
    const admin = await prisma.adminUser.create({
      data: {
        supabaseUserId: data.user.id,
        email,
        name: sanitizeText(email.split("@")[0] ?? "Admin", 80),
        role: "OWNER",
        lastLoginAt: new Date(),
      },
    });
    return { sub: admin.supabaseUserId, email: admin.email, name: admin.name, role: admin.role };
  }

  // Normal path: sign in via Supabase Auth, then confirm the local registry.
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  });
  if (error || !data.user) return null;

  const admin = await prisma.adminUser.findUnique({
    where: { supabaseUserId: data.user.id },
  });
  if (!admin || !admin.isActive) return null;

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  return { sub: admin.supabaseUserId, email: admin.email, name: admin.name, role: admin.role };
}

export async function audit(entry: {
  session: AdminSession;
  action: string;
  entity: string;
  entityId?: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  const admin = await prisma.adminUser.findUnique({
    where: { supabaseUserId: entry.session.sub },
    select: { id: true },
  });
  if (!admin) return;
  await prisma.adminAuditLog.create({
    data: {
      adminId: admin.id,
      action: sanitizeText(entry.action, 80),
      entity: sanitizeText(entry.entity, 40),
      entityId: entry.entityId ? sanitizeText(entry.entityId, 80) : undefined,
      detail: (entry.detail ?? undefined) as never,
    },
  });
}
