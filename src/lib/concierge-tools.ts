"use server";

/**
 * Concierge tools — the AI's hands on the store.
 *
 * Each tool is a plain server function the model can invoke by name via
 * OpenRouter's OpenAI-compatible tool-calling. Cart mutations mirror the
 * exact contract of the zustand cart-store, so the drawer updates live.
 * The model never invents inventory: every product fact comes from
 * `listProducts` / `getProductBySlug`.
 */
import { listProducts, getProductBySlug, type CatalogProduct } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

export type ToolResult = { ok: boolean; reply: string; data?: unknown };

function totalAvailable(p: CatalogProduct): number {
  return p.variants.reduce((s, v) => s + v.available, 0);
}

function productLine(p: CatalogProduct): string {
  const avail = totalAvailable(p);
  const price = formatPrice(p.basePrice, p.currency);
  if (avail === 0) {
    return `- ${p.name} — ${price} — SOLD OUT (0 pieces in stock) — ${p.category.toLowerCase()} — /products/${p.slug}`;
  }
  const perSize = p.variants
    .filter((v) => v.available > 0)
    .map((v) => `${v.size}: ${v.available}`)
    .join(", ");
  const unitWord = avail === 1 ? "1 piece" : `${avail} pieces`;
  return `- ${p.name} — ${price} — IN STOCK: ${unitWord} total (per size: ${perSize}) — ${p.category.toLowerCase()} — /products/${p.slug}`;
}

/** search_products — name/category/price/size/color aware catalog search. */
export async function toolSearchProducts(input: {
  query?: string;
  category?: string;
  maxPrice?: number;
  size?: string;
}): Promise<ToolResult> {
  const { products } = await listProducts({ search: input.query, take: 30 });
  let pool = products;

  if (input.category) {
    const cat = input.category.toLowerCase();
    pool = pool.filter(
      (p) => p.category.toLowerCase().startsWith(cat) || p.categoryLabel.toLowerCase().includes(input.category!.toLowerCase())
    );
  }
  if (typeof input.maxPrice === "number") {
    pool = pool.filter((p) => parseFloat(p.basePrice) <= input.maxPrice!);
  }
  if (input.size) {
    const s = input.size.toUpperCase();
    pool = pool.filter((p) => p.variants.some((v) => v.size.toUpperCase() === s && v.available > 0));
  }

  if (pool.length === 0) {
    return { ok: true, reply: "No pieces matched that description in the current run." };
  }
  return { ok: true, reply: pool.slice(0, 6).map(productLine).join("\n") };
}

/** add_to_cart — finds the product, picks the variant, mirrors cart-store.add. */
export async function toolAddToCart(input: {
  product?: string;
  size?: string;
  color?: string;
  quantity?: number;
}): Promise<ToolResult> {
  const { products } = await listProducts({ search: input.product, take: 10 });
  if (products.length === 0) {
    return { ok: false, reply: `I could not find a piece matching "${input.product ?? "that"}" in the current run.` };
  }
  const p = products[0]!;

  const sizes = p.variants.filter((v) => v.available > 0);
  if (sizes.length === 0) {
    return { ok: false, reply: `${p.name} is currently sold out.` };
  }
  const wanted = (input.size ?? "").toUpperCase();
  const variant = wanted ? sizes.find((v) => v.size.toUpperCase() === wanted) : sizes[0];
  if (wanted && !variant) {
    return { ok: false, reply: `${p.name} has no size ${wanted} available — sizes in stock: ${sizes.map((v) => v.size).join(", ")}.` };
  }
  const chosen = variant ?? sizes[0]!;

  // Mirror of the client cart-store `add` contract (same fields the drawer renders).
  const payload = {
    variantId: chosen.id,
    productId: p.id,
    slug: p.slug,
    productName: p.name,
    sku: chosen.sku,
    size: chosen.size,
    color: chosen.color,
    image: p.image,
    unitPrice: parseFloat(p.basePrice),
    currency: p.currency,
    quantity: Math.max(1, Math.min(10, input.quantity ?? 1)),
  };

  // Hand the mutation to the client store through the tool-bridge window event.
  return {
    ok: true,
    reply: `Added ${p.name} — size ${chosen.size} to your bag.`,
    data: { action: "addToCart", payload },
  };
}

/** set_quantity — includes zero as "remove". */
export async function toolSetQuantity(input: { index: number; quantity: number }): Promise<ToolResult> {
  return {
    ok: true,
    reply: input.quantity <= 0 ? "Removed from your bag." : "Bag updated.",
    data: { action: "setQuantity", index: input.index, quantity: input.quantity },
  };
}

/** get_cart — the bridge resolves the live lines client-side. */
export async function toolGetCart(): Promise<ToolResult> {
  return { ok: true, reply: "", data: { action: "getCart" } };
}
