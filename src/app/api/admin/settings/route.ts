/**
 * Admin settings API — read/write the StoreSetting row ("store" key).
 *
 * GET  /api/admin/settings → full settings JSON
 * PUT  /api/admin/settings → validated update (Zod), audit-logged
 *
 * Guarded by withAdminGuard (404-obfuscated) like all admin APIs.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdminGuard } from "@/lib/api";
import { audit } from "@/lib/admin-auth";
import { getStoreSettings, saveStoreSettings, type StoreSettings } from "@/lib/store-settings";

export const runtime = "nodejs";

const settingsSchema = z.object({
  whatsappNumber: z.string().trim().regex(/^[0-9+()\-\s]{7,20}$/, "Enter a valid phone number"),
  momo: z.object({
    provider: z.string().trim().min(2).max(60),
    number: z.string().trim().min(7).max(20),
    accountName: z.string().trim().min(2).max(80),
    alternates: z
      .array(
        z.object({
          provider: z.string().trim().min(2).max(60),
          number: z.string().trim().min(7).max(20),
          accountName: z.string().trim().min(2).max(80),
        })
      )
      .max(5)
      .default([]),
  }),
  localCurrency: z.string().trim().length(3),
  usdToLocalRate: z.number().positive().max(1_000_000),
  deliveryAreas: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(80),
        fee: z.number().min(0).max(1_000_000),
        estimate: z.string().trim().min(2).max(80),
      })
    )
    .min(1)
    .max(10),
  reservationMinutes: z.number().int().min(5).max(240),
  whatsappEnabled: z.boolean(),
});

export const GET = withAdminGuard(async () => {
  const settings = await getStoreSettings();
  return NextResponse.json({ settings });
});

export const PUT = withAdminGuard(async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid settings", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
      { status: 400 }
    );
  }

  const before = await getStoreSettings();
  const saved = await saveStoreSettings(parsed.data as StoreSettings);

  await audit({
    session: req.session,
    action: "settings.updated",
    entity: "StoreSetting",
    entityId: "store",
    detail: {
      before: { whatsappNumber: before.whatsappNumber, momoNumber: before.momo.number, areas: before.deliveryAreas.length },
      after: { whatsappNumber: saved.whatsappNumber, momoNumber: saved.momo.number, areas: saved.deliveryAreas.length },
    },
  });

  return NextResponse.json({ ok: true, settings: saved });
});
