/**
 * Rohde analytics — type-safe event dispatcher.
 *
 * One `trackEvent` call fans out to GA4, Meta Pixel, and TikTok Pixel.
 * Payloads are fully typed; unknown events fail at compile time.
 * All provider calls are guarded so analytics can never break the UI.
 */

export type AnalyticsPayload = {
  currency?: string;
  value?: number;
  contents?: Array<{
    id: string;
    quantity?: number;
    item_price?: number;
    content_name?: string;
    content_category?: string;
  }>;
  search_string?: string;
  order_id?: string;
  [key: string]: unknown;
};

export type AnalyticsEvent =
  | "product_viewed"
  | "product_added_to_cart"
  | "checkout_started"
  | "purchase_completed"
  | "search_performed"
  | "wishlist_added";

/** Provider-specific mirrors keep sinks type-safe. */
type Ga4Event =
  | "view_item"
  | "add_to_cart"
  | "begin_checkout"
  | "purchase"
  | "search"
  | "add_to_wishlist";
type MetaEvent =
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase"
  | "Search"
  | "AddToWishlist";
type TikTokEvent =
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "PlaceAnOrder"
  | "CompletePayment"
  | "Search"
  | "AddToWishlist";

const EVENT_MAP: Record<
  AnalyticsEvent,
  { meta: MetaEvent; tiktok: TikTokEvent; ga4: Ga4Event }
> = {
  product_viewed: { meta: "ViewContent", tiktok: "ViewContent", ga4: "view_item" },
  product_added_to_cart: { meta: "AddToCart", tiktok: "AddToCart", ga4: "add_to_cart" },
  checkout_started: { meta: "InitiateCheckout", tiktok: "InitiateCheckout", ga4: "begin_checkout" },
  purchase_completed: {
    meta: "Purchase",
    tiktok: "PlaceAnOrder",
    ga4: "purchase",
  },
  search_performed: { meta: "Search", tiktok: "Search", ga4: "search" },
  wishlist_added: { meta: "AddToWishlist", tiktok: "AddToWishlist", ga4: "add_to_wishlist" },
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    ttq?: { track: (event: string, data?: Record<string, unknown>) => void };
  }
}

function toGa4(payload: AnalyticsPayload): Record<string, unknown> {
  return {
    currency: payload.currency,
    value: payload.value,
    items: payload.contents?.map((c) => ({
      item_id: c.id,
      item_name: c.content_name,
      item_category: c.content_category,
      price: c.item_price,
      quantity: c.quantity,
    })),
    search_term: payload.search_string,
    transaction_id: payload.order_id,
  };
}

function toMeta(payload: AnalyticsPayload): Record<string, unknown> {
  return {
    currency: payload.currency,
    value: payload.value,
    content_ids: payload.contents?.map((c) => c.id),
    content_type: "product",
    contents: payload.contents,
    search_string: payload.search_string,
    order_id: payload.order_id,
  };
}

function toTikTok(payload: AnalyticsPayload): Record<string, unknown> {
  return {
    currency: payload.currency,
    value: payload.value,
    contents: payload.contents?.map((c) => ({
      content_id: c.id,
      content_name: c.content_name,
      content_type: "product",
      quantity: c.quantity,
      price: c.item_price,
    })),
    query: payload.search_string,
    order_id: payload.order_id,
  };
}

function safeCall(fn: () => void, provider: string): void {
  try {
    if (typeof window === "undefined") return;
    fn();
  } catch (error) {
    console.warn(`[analytics] ${provider} sink failed`, error);
  }
}

/** The single analytics entrypoint. Fire-and-forget, never throws. */
export function trackEvent(event: AnalyticsEvent, payload: AnalyticsPayload = {}): void {
  const mapping = EVENT_MAP[event];
  if (!mapping) return;

  safeCall(() => {
    window.gtag?.("event", mapping.ga4, toGa4(payload));
  }, "ga4");

  safeCall(() => {
    window.fbq?.("track", mapping.meta, toMeta(payload));
  }, "meta");

  safeCall(() => {
    window.ttq?.track(mapping.tiktok, toTikTok(payload));
  }, "tiktok");

  if (process.env.NODE_ENV === "development") {
    console.debug(`[analytics] ${event}`, payload);
  }
}
