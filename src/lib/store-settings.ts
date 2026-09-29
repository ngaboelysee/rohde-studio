/**
 * Store settings — admin-managed configuration for WhatsApp checkout,
 * mobile-money receiving accounts and delivery areas. Persisted in the
 * StoreSetting table, cached briefly server-side. Nothing here is
 * hard-coded in the frontend; the storefront reads a sanitized subset
 * through /api/store-config.
 */
import "server-only";
import { prisma } from "@/lib/prisma";

export type DeliveryArea = {
  name: string;
  fee: number;
  estimate: string; // e.g. "Same day (within 4 hours)" or "2–3 business days"
};

export type StoreSettings = {
  /** Business WhatsApp number in international digits, e.g. 250781214230 */
  whatsappNumber: string;
  /** Receiving mobile-money account shown to customers by the bot. */
  momo: {
    provider: string; // e.g. "MTN Mobile Money"
    number: string; // e.g. 0788123456
    accountName: string; // e.g. FREEBUFF
    /** Alternate receivers per provider name → number (optional). */
    alternates: { provider: string; number: string; accountName: string }[];
  };
  /** Currency for WhatsApp/mobile-money orders (catalog stays multi-currency). */
  localCurrency: string; // e.g. RWF
  /** Fixed conversion used at checkout when catalog currency differs. */
  usdToLocalRate: number;
  deliveryAreas: DeliveryArea[];
  /** Stock reservation window for unpaid WhatsApp orders (minutes). */
  reservationMinutes: number;
  /** Enable/disable the WhatsApp checkout channel entirely. */
  whatsappEnabled: boolean;
};

const SETTINGS_KEY = "store";

export const DEFAULT_SETTINGS: StoreSettings = {
  whatsappNumber: "250781214230",
  momo: {
    provider: "MTN Mobile Money",
    number: "0788123456",
    accountName: "FREEBUFF",
    alternates: [],
  },
  localCurrency: "RWF",
  usdToLocalRate: 1300,
  deliveryAreas: [
    { name: "Kigali — central", fee: 2000, estimate: "Same day (within 4 hours)" },
    { name: "Kigali — outskirts", fee: 3000, estimate: "Same day (within 6 hours)" },
    { name: "Other cities (Rwanda)", fee: 5000, estimate: "1–2 business days" },
  ],
  reservationMinutes: 30,
  whatsappEnabled: true,
};

let cache: { at: number; value: StoreSettings } | null = null;

function coerce(raw: unknown): StoreSettings {
  const v = (raw ?? {}) as Partial<StoreSettings>;
  return {
    whatsappNumber: typeof v.whatsappNumber === "string" ? v.whatsappNumber.replace(/\D/g, "") : DEFAULT_SETTINGS.whatsappNumber,
    momo: {
      provider: v.momo?.provider || DEFAULT_SETTINGS.momo.provider,
      number: v.momo?.number || DEFAULT_SETTINGS.momo.number,
      accountName: v.momo?.accountName || DEFAULT_SETTINGS.momo.accountName,
      alternates: Array.isArray(v.momo?.alternates) ? v.momo!.alternates : [],
    },
    localCurrency: (v.localCurrency || DEFAULT_SETTINGS.localCurrency).toUpperCase().slice(0, 4),
    usdToLocalRate: Number(v.usdToLocalRate) > 0 ? Number(v.usdToLocalRate) : DEFAULT_SETTINGS.usdToLocalRate,
    deliveryAreas:
      Array.isArray(v.deliveryAreas) && v.deliveryAreas.length > 0
        ? v.deliveryAreas.map((a) => ({
            name: String(a.name).slice(0, 80),
            fee: Math.max(0, Number(a.fee) || 0),
            estimate: String(a.estimate).slice(0, 80),
          }))
        : DEFAULT_SETTINGS.deliveryAreas,
    reservationMinutes: Math.min(240, Math.max(5, Number(v.reservationMinutes) || DEFAULT_SETTINGS.reservationMinutes)),
    whatsappEnabled: v.whatsappEnabled !== false,
  };
}

export async function getStoreSettings(): Promise<StoreSettings> {
  if (cache && Date.now() - cache.at < 30_000) return cache.value;
  try {
    const row = await prisma.storeSetting.findUnique({ where: { key: SETTINGS_KEY } });
    const value = coerce(row?.value);
    cache = { at: Date.now(), value };
    return value;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveStoreSettings(next: StoreSettings): Promise<StoreSettings> {
  const value = coerce(next);
  await prisma.storeSetting.upsert({
    where: { key: SETTINGS_KEY },
    update: { value: value as never },
    create: { key: SETTINGS_KEY, value: value as never },
  });
  cache = { at: Date.now(), value };
  return value;
}

/** Public projection for the storefront — never includes secrets. */
export function publicStoreConfig(s: StoreSettings) {
  return {
    whatsappEnabled: s.whatsappEnabled,
    whatsappNumber: s.whatsappNumber,
    localCurrency: s.localCurrency,
    usdToLocalRate: s.usdToLocalRate,
    deliveryAreas: s.deliveryAreas,
    reservationMinutes: s.reservationMinutes,
  };
}
