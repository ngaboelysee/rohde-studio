/** Anything that can be coerced to a price — includes Prisma Decimal. */
export type PriceLike = string | number | { toString(): string };

/** Format a decimal price as branded currency. */
export function formatPrice(
  value: PriceLike,
  currency = "USD",
  locale = "en-US"
): string {
  const amount =
    typeof value === "number" ? value : parseFloat(value.toString());
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatDate(value: string | Date, locale = "en-US"): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
