"server-only";

/**
 * Studio Copilot tools — the admin AI's hands on the store.
 *
 * READ tools return verbatim inventory facts (counts, prices, SKUs) so the
 * model never has to invent anything. WRITE goes through the exact same
 * audited upsert as the manual dashboard editor — every AI-driven stock
 * change lands in AdminAuditLog like any other privileged action.
 */
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import type { AdminSession } from "@/lib/admin-session";
import { audit } from "@/lib/admin-auth";
import { sanitizeText } from "@/lib/sanitize";

export type ToolResult = { ok: boolean; reply: string };

function availability(onHand: number, reserved: number): number {
  return Math.max(0, onHand - reserved);
}

/** inventory_lookup — full per-size stock + price for one product. */
export async function toolInventoryLookup(input: {
  product: string;
}): Promise<ToolResult> {
  const q = sanitizeText(input.product ?? "", 80);
  if (!q) return { ok: false, reply: "No product name given." };

  const product = await prisma.product.findFirst({
    where: {
      OR: [{ slug: q.toLowerCase() }, { name: { contains: q, mode: "insensitive" } }],
    },
    include: {
      variants: {
        where: { active: true },
        orderBy: { size: "asc" },
        include: { inventory: true },
      },
    },
  });

  if (!product) {
    return { ok: true, reply: `NO MATCH: no product named "${q}" exists in the catalog. Do not guess at similar names.` };
  }

  const lines = product.variants.map((v) => {
    const onHand = v.inventory?.onHand ?? 0;
    const reserved = v.inventory?.reserved ?? 0;
    const avail = availability(onHand, reserved);
    const price = v.price ? formatPrice(v.price, product.currency) : formatPrice(product.basePrice, product.currency);
    return `  ${v.sku} — size ${v.size} · ${v.color} — ${price} — on hand ${onHand}, reserved ${reserved}, AVAILABLE ${avail}`;
  });

  const total = product.variants.reduce((s, v) => s + availability(v.inventory?.onHand ?? 0, v.inventory?.reserved ?? 0), 0);

  return {
    ok: true,
    reply: [
      `${product.name} (${product.status}, ${product.category}) — base ${formatPrice(product.basePrice, product.currency)}`,
      ...lines,
      `TOTAL AVAILABLE: ${total} pieces`,
    ].join("\n"),
  };
}

/** low_stock_report — every variant at or below a threshold, worst first. */
export async function toolLowStockReport(input: { threshold?: number }): Promise<ToolResult> {
  const threshold = Math.max(0, Math.min(100, Math.floor(input.threshold ?? 3)));
  const rows = await prisma.inventory.findMany({
    where: { onHand: { lte: threshold } },
    include: { variant: { include: { product: true } } },
    orderBy: { onHand: "asc" },
    take: 40,
  });

  if (rows.length === 0) {
    return { ok: true, reply: `All variants are above ${threshold} units on hand. No restocking needed.` };
  }

  const lines = rows.map((inv) => {
    const v = inv.variant;
    const avail = availability(inv.onHand, inv.reserved);
    return `- ${v.product.name} — ${v.sku} — size ${v.size} · ${v.color} — on hand ${inv.onHand}, reserved ${inv.reserved}, AVAILABLE ${avail}${inv.onHand === 0 ? " — SOLD OUT" : ""}`;
  });

  return { ok: true, reply: [`VARIANTS AT OR BELOW ${threshold} UNITS:`, ...lines].join("\n") };
}

/** set_stock — adjust on-hand for one variant, same audited path as the dashboard. */
export async function toolSetStock(
  session: AdminSession,
  input: { sku: string; onHand: number }
): Promise<ToolResult> {
  const sku = sanitizeText(input.sku ?? "", 40).toUpperCase();
  const onHand = Math.floor(Number(input.onHand));

  if (!sku || !Number.isFinite(onHand) || onHand < 0 || onHand > 100_000) {
    return { ok: false, reply: "Invalid set_stock arguments — need a SKU and a non-negative on-hand count." };
  }

  const variant = await prisma.variant.findFirst({
    where: { sku },
    include: { inventory: true, product: { select: { name: true } } },
  });
  if (!variant) {
    return { ok: false, reply: `NO MATCH: no variant with SKU "${sku}". Use inventory_lookup to find exact SKUs.` };
  }

  const previous = variant.inventory?.onHand ?? 0;

  await prisma.inventory.upsert({
    where: { variantId: variant.id },
    update: { onHand },
    create: { variantId: variant.id, onHand },
  });

  await audit({
    session,
    action: "inventory.adjusted",
    entity: "Inventory",
    entityId: variant.sku,
    detail: { onHand, previous, via: "studio-copilot" },
  });

  return {
    ok: true,
    reply: `STOCK UPDATED: ${variant.product.name} ${variant.sku} (size ${variant.size}) on hand ${previous} → ${onHand}. This change is audit-logged.`,
  };
}

/** product_status — toggle DRAFT/ACTIVE/ARCHIVED, audited. */
export async function toolSetProductStatus(
  session: AdminSession,
  input: { product: string; status: "DRAFT" | "ACTIVE" | "ARCHIVED" }
): Promise<ToolResult> {
  const q = sanitizeText(input.product ?? "", 80);
  const status = input.status;
  if (!q || !["DRAFT", "ACTIVE", "ARCHIVED"].includes(status)) {
    return { ok: false, reply: "Invalid product_status arguments." };
  }

  const product = await prisma.product.findFirst({
    where: { OR: [{ slug: q.toLowerCase() }, { name: { contains: q, mode: "insensitive" } }] },
    select: { id: true, name: true, slug: true, status: true },
  });
  if (!product) return { ok: false, reply: `NO MATCH: no product named "${q}".` };

  await prisma.product.update({ where: { id: product.id }, data: { status } });

  await audit({
    session,
    action: "product.updated",
    entity: "Product",
    entityId: product.slug,
    detail: { status, previous: product.status, via: "studio-copilot" },
  });

  return { ok: true, reply: `STATUS UPDATED: ${product.name} ${product.status} → ${status}. Audit-logged.` };
}
