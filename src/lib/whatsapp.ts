/**
 * WhatsApp checkout formatting helpers — phone normalization, order message
 * composition and bot reply text. Pure functions (no server imports) so both
 * the client and server can use the phone formatter.
 */

/** Normalize a local/international phone to E.164 digits (no plus). */
export function normalizePhone(raw: string, defaultCountry = "250"): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (raw.trim().startsWith("+")) return digits;
  if (digits.startsWith("0")) return defaultCountry + digits.slice(1);
  if (digits.startsWith(defaultCountry)) return digits;
  return defaultCountry + digits;
}

/** Format E.164 digits into wa.me link + human display. */
export function waLink(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export type WaLine = {
  productName: string;
  size: string;
  color: string;
  quantity: number;
  lineTotal: number;
};

export type WaOrderSummary = {
  orderNumber: string;
  lines: WaLine[];
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  deliveryArea: string;
  addressLine: string;
  name: string;
  phone: string;
  instructions?: string | null;
};

/** Compose the pre-filled WhatsApp checkout message (customer-facing). */
export function composeOrderMessage(o: WaOrderSummary): string {
  const fmt = (n: number) => n.toLocaleString("en-US");
  const items = o.lines
    .map(
      (l) =>
        `${l.quantity} × ${l.productName} — Size ${l.size}${l.color ? `, ${l.color}` : ""}\n${fmt(l.lineTotal)} ${o.currency}`
    )
    .join("\n");

  return [
    `Hello, I would like to place this order:`,
    ``,
    `Order: #${o.orderNumber}`,
    items,
    ``,
    `Subtotal: ${fmt(o.subtotal)} ${o.currency}`,
    `Delivery (${o.deliveryArea}): ${fmt(o.shipping)} ${o.currency}`,
    `Total to Pay: ${fmt(o.total)} ${o.currency}`,
    ``,
    `Delivery Address: ${o.addressLine}${o.instructions ? ` — ${o.instructions}` : ""}`,
    `Name: ${o.name}`,
    `Phone: ${o.phone}`,
    ``,
    `Please confirm payment instructions.`,
  ].join("\n");
}

/** Bot reply: payment instructions (from admin settings, never hard-coded client-side). */
export function composePaymentInstructions(o: {
  total: number;
  currency: string;
  momo: { provider: string; number: string; accountName: string };
}): string {
  const fmt = (n: number) => n.toLocaleString("en-US");
  return [
    `Your order total is ${fmt(o.total)} ${o.currency}.`,
    ``,
    `Please send exactly ${fmt(o.total)} ${o.currency} to:`,
    `Mobile Money Number: ${o.momo.number}`,
    `Account Name: ${o.momo.accountName}`,
    `${o.momo.provider ? `(${o.momo.provider})` : ""}`,
    ``,
    `After paying, send us the payment confirmation here.`,
    `Your order will only be confirmed after payment is verified.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Bot reply: underpayment / balance reminder. */
export function composeBalanceReminder(o: {
  orderNumber: string;
  verified: number;
  total: number;
  currency: string;
}): string {
  const fmt = (n: number) => n.toLocaleString("en-US");
  const remaining = Math.max(0, o.total - o.verified);
  return [
    `We've confirmed ${fmt(o.verified)} ${o.currency} so far for order #${o.orderNumber}.`,
    `Your order total is ${fmt(o.total)} ${o.currency}, so the remaining balance is ${fmt(remaining)} ${o.currency}.`,
    `Please send the remaining ${fmt(remaining)} ${o.currency} and forward the new payment confirmation here.`,
  ].join("\n");
}

/** Bot reply: confirmation + delivery estimate. */
export function composeOrderConfirmed(o: {
  orderNumber: string;
  amount: number;
  currency: string;
  address: string;
  estimate: string;
}): string {
  const fmt = (n: number) => n.toLocaleString("en-US");
  return [
    `Payment confirmed ✅`,
    `Your order #${o.orderNumber} has been placed successfully.`,
    ``,
    `Amount received: ${fmt(o.amount)} ${o.currency}`,
    `Delivery: ${o.address}`,
    ``,
    `Estimated delivery: ${o.estimate}.`,
    `Thank you for shopping with us.`,
  ].join("\n");
}
