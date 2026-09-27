/**
 * Checkout API — the server-side source of truth.
 * 1. Re-validate the entire payload with Zod (never trust the client).
 * 2. Re-check inventory atomically (the cart store is advisory only).
 * 3. Create PENDING order + reserve stock.
 * 4. Initialize the selected gateway and return its redirect.
 * Stock is only committed later, by a signature-verified webhook.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkoutSubmitSchema } from "@/lib/validation";
import { sanitizeEmail, sanitizeText } from "@/lib/sanitize";
import { assertStock, reserveStock, releaseStock, InventoryError } from "@/lib/inventory";
import { selectGateway, gatewayCurrencyAllowed, demoConvert } from "@/lib/payments/gateway";
import { initProviderPayment } from "@/lib/payments/adapters";
import { getCustomer } from "@/lib/auth";

function generateOrderNumber(): string {
  const rand = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `ROH-${rand}`;
}

export async function POST(req: Request): Promise<NextResponse> {
  let reserved = false;
  let lines: { variantId: string; quantity: number }[] = [];

  try {
    const body = await req.json().catch(() => null);
    const parsed = checkoutSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid checkout details", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { customer, items } = parsed.data;
    lines = items;

    // Server-side pricing: recompute from the database, never trust client prices.
    const variantIds = items.map((i) => i.variantId);
    const variants = await prisma.variant.findMany({
      where: { id: { in: variantIds }, active: true },
      include: { product: true },
    });
    if (variants.length !== new Set(variantIds).size) {
      return NextResponse.json({ error: "One or more items are unavailable." }, { status: 400 });
    }

    const priceMap = new Map(
      variants.map((v) => [
        v.id,
        parseFloat((v.price ?? v.product.basePrice).toString()),
      ])
    );
    const currencyByVariant = new Map(variants.map((v) => [v.id, v.product.currency]));

    const subtotal = items.reduce(
      (sum, i) => sum + (priceMap.get(i.variantId) ?? 0) * i.quantity,
      0
    );
    const currency = currencyByVariant.get(items[0]?.variantId ?? "") ?? "USD";

    // Gateway selection by destination country.
    const provider = selectGateway({ country: customer.country, currency, total: subtotal, email: customer.email });
    if (!gatewayCurrencyAllowed(provider, currency)) {
      // Convert to the provider's preferred corridor currency (demo rates).
      const converted = demoConvert(subtotal, currency);
      if (converted <= 0) {
        return NextResponse.json({ error: "Currency not supported for this gateway." }, { status: 400 });
      }
    }

    // Hard inventory gate.
    await assertStock(items);
    await reserveStock(items);
    reserved = true;

    const customerUser = await getCustomer();
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: customerUser?.id ?? null,
        email: sanitizeEmail(customer.email),
        status: "PENDING",
        subtotal,
        shipping: 0,
        tax: 0,
        total: subtotal,
        currency,
        provider,
        shippingName: sanitizeText(customer.fullName, 120),
        shippingLine1: sanitizeText(customer.line1, 200),
        shippingLine2: customer.line2 ? sanitizeText(customer.line2, 200) : null,
        shippingCity: sanitizeText(customer.city, 80),
        shippingRegion: customer.region ? sanitizeText(customer.region, 80) : null,
        shippingPostal: customer.postalCode ? sanitizeText(customer.postalCode, 20) : null,
        shippingCountry: customer.country.toUpperCase(),
        shippingPhone: sanitizeText(customer.phone, 20),
        items: {
          create: items.map((i) => {
            const variant = variants.find((v) => v.id === i.variantId);
            if (!variant) throw new Error("variant missing during order creation");
            return {
              variantId: variant.id,
              productName: variant.product.name,
              variantSku: variant.sku,
              size: variant.size,
              color: variant.color,
              image: variant.product.images[0] ?? null,
              unitPrice: priceMap.get(variant.id) ?? 0,
              quantity: i.quantity,
            };
          }),
        },
      },
      include: { items: true },
    });

    // Initialize payment with the gateway.
    const origin = new URL(req.url).origin;
    const payment = await initProviderPayment({
      provider,
      orderNumber: order.orderNumber,
      email: order.email,
      amount: subtotal,
      currency,
      lines: order.items.map((i) => ({
        name: `${i.productName} (${i.size})`,
        unitPrice: parseFloat(i.unitPrice.toString()),
        quantity: i.quantity,
      })),
      origin,
    });

    return NextResponse.json({
      ok: true,
      orderNumber: order.orderNumber,
      redirectUrl: payment.redirectUrl,
    });
  } catch (error) {
    // Roll back reservations on any failure after reserving.
    if (reserved && lines.length > 0) {
      await releaseStock(lines).catch(() => undefined);
    }
    if (error instanceof InventoryError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[checkout]", error);
    return NextResponse.json(
      { error: "Checkout could not be completed. Please try again." },
      { status: 500 }
    );
  }
}
