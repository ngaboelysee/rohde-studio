# Rohde — Digital Flagship Store

Production-grade e-commerce flagship for the luxury fashion house **Rohde**. Contemporary streetwear graphics meet minimalist industrial luxury — charcoal (`#0B0B0B`), off-white (`#FBFBFB`), raw concrete (`#8C8C8C`), generous whitespace, edge-to-edge editorial.

**Stack:** Next.js 14 (App Router) · TypeScript strict · Tailwind CSS · Framer Motion · Prisma + PostgreSQL · NextAuth (customers) · Supabase (admin + storage) · Stripe / Paystack / Flutterwave / Mobile Money · GA4 + Meta Pixel + TikTok Pixel.

---

## 1. Quick Start

```bash
npm install                 # installs deps + generates the Prisma client
cp .env.example .env        # fill in real credentials (see below)
npx prisma migrate dev      # create schema
npm run db:seed             # ORBIT 001 collection + demo customer
npm run dev                 # http://localhost:3000
```

**Demo customer:** `demo@rohde.store` / `rohde-demo`

**First admin:** visit `/admin/login`. On first login (empty registry) supply the
`ADMIN_SIGNUP_INVITE_CODE`; the owner account is created in Supabase Auth and
mirrored into the local `AdminUser` registry. Rotate the invite code afterwards.

### Required environment variables

See `.env.example` for the full annotated contract. Highlights:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | PostgreSQL (Supabase pooler + direct connection) |
| `NEXTAUTH_SECRET` | Signs customer JWT sessions **and** admin cookie (HS256) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Admin auth + storage writes |
| `ADMIN_SIGNUP_INVITE_CODE` | One-time bootstrap code for the first owner |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | Stripe payments + webhook verification |
| `PAYSTACK_SECRET_KEY` | Paystack payments + HMAC-SHA512 webhook verification |
| `FLUTTERWAVE_SECRET_KEY` + `FLUTTERWAVE_SECRET_HASH` | Flutterwave/Mobile Money + `verif-hash` check |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` / `NEXT_PUBLIC_META_PIXEL_ID` / `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | Optional analytics sinks |

---

## 2. Architecture

### Authentication isolation (strict)

```
CUSTOMERS                          ADMIN STAFF
─────────────────────              ─────────────────────────
NextAuth (Auth.js) v4              Supabase Auth
JWT in __Secure-rohde.session-     Password verify via service-role
token HTTP-only cookie             Admin JWT in __Secure-rohde.admin
Prisma User table                  AdminUser registry + audit log
/account/*                         /admin/*
/api/auth/*                        /api/admin/*
```

- Customer routes **never** import `supabase-admin.ts` (`import "server-only"` enforced).
- Admin routes **never** use NextAuth. Sessions are independent `jose`-signed cookies.
- Every privileged action writes an `AdminAuditLog` row (`src/lib/admin-auth.ts → audit()`).

### Route obfuscation

`src/middleware.ts` intercepts `/admin/*` and `/api/admin/*`. Invalid or missing
admin cookie → **standard 404**, byte-identical to a nonexistent page. No 403, no
redirect, no admin surface disclosure. `not-found.tsx` and `global-error.tsx` are
branded but the middleware 404 is deliberately plain.

### Payment flow (inventory-safe)

```
Checkout API (server)
  1. Zod re-validation of the entire payload
  2. Prices recomputed from PostgreSQL — client prices never trusted
  3. assertStock() → atomic availability check
  4. reserveStock() → reserved += qty   (oversell impossible: conditional updates)
  5. Order created (PENDING)
  6. Gateway init → hosted redirect (Stripe/Paystack/Flutterwave/Mobile Money)

Webhook (server, raw-body signature verified FIRST)
  Stripe   → stripe-signature  (constructEvent)
  Paystack → x-paystack-signature (HMAC-SHA512, timingSafeEqual)
  Flutterwave → verif-hash     (timingSafeEqual)
  7. fulfillOrderFromWebhook() — idempotent via unique Payment.rawEventId
  8. commitStock() — onHand -= qty, reserved -= qty   (PAID)
```

Failure/cancellation path: `markOrderFailed()` releases context; abandoned
PENDING orders keep reservations until an admin cancels (`releaseStock()`).

Gateway routing by `country` code lives in `src/lib/payments/gateway.ts`:
Mobile-Money corridors (GH/KE/UG/TZ/CI/SN) → Mobile Money, NG → Paystack,
other African corridors → Flutterwave, everywhere → Stripe.

### Analytics

Single typed dispatcher `src/lib/analytics/events.ts`:

```ts
trackEvent("product_added_to_cart", { value: 640, currency: "USD",
  contents: [{ id: "RHD-ORB-PUF-MC-01", quantity: 1, item_price: 640 }] });
```

Events: `product_viewed`, `product_added_to_cart`, `checkout_started`,
`purchase_completed`, `search_performed`, `wishlist_added`. Each fans out to
GA4 (`view_item`, `add_to_cart`, …), Meta Pixel (`ViewContent`, `AddToCart`, …)
and TikTok (`PlaceAnOrder`, …) with per-provider payload shaping. Sinks are
individually guarded — analytics can never break the UI. Scripts load only when
the corresponding `NEXT_PUBLIC_*` ID is set.

---

## 3. Production UI States

| State | Where |
|---|---|
| Skeleton loading (zero CLS) | `ProductGridSkeleton`, `PdpSkeleton` + Suspense streams |
| Empty cart | CartDrawer + checkout page |
| Empty wishlist | `/wishlist` |
| No search results | `/search` |
| Sold-out variant | PDP size buttons disabled/struck, badge, `maxAvailable` clamps in cart |
| Low stock | `StockBadge` (≤3) + admin dashboard alerts |
| Payment failure | `/checkout/failure` with recovery paths |
| Order success | `/checkout/success`, clears bag, fires `purchase_completed` once |
| 404 / 500 | `not-found.tsx`, `error.tsx`, `global-error.tsx` |

## 4. Security Checklist

- ✅ Zod validation on every client form **and** server boundary before queries
- ✅ DOMPurify (jsdom) sanitization: `sanitizeHtml`, `sanitizeText`, `sanitizeEmail`
- ✅ Webhook raw-body signature verification before any DB write (all 3 gateways)
- ✅ Webhook idempotency via `Payment.rawEventId` unique constraint
- ✅ Secrets server-only (`src/lib/env.ts` validates at boot; `server-only` imports)
- ✅ `timingSafeEqual` for all hash comparisons
- ✅ Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- ✅ bcrypt (cost 12) customer passwords; Supabase manages admin credentials
- ✅ Upload defense: MIME allowlist + 8 MB cap, storage writes via service role only
- ✅ Admin enumeration hardening: uniform errors, obfuscated routes

## 5. Accessibility (WCAG AAA targets)

- `:focus-visible` outlines globally (light/dark context aware)
- Full keyboard support: cart drawer focus trap + Esc + focus restore, search overlay
- `aria-live` regions for cart qty, notices, async statuses
- `.sr-only` helpers, skip-to-content link, semantic landmarks throughout
- `prefers-reduced-motion` disables all animation

## 6. Project Structure

```
prisma/            schema.prisma, seed.ts (ORBIT 001 collection)
src/middleware.ts  admin obfuscation (404)
src/lib/           env, prisma, sanitize, validation, inventory, seo, format
src/lib/analytics  events.ts (typed dispatcher)
src/lib/payments   gateway router, adapters, webhook fulfillment
src/stores/        cart (persist + boundary checks), wishlist, ui
src/components/    brand, ui, layout, product, cart, checkout, admin
src/app/           storefront + /admin + /api (webhooks, checkout, admin)
```

## 7. Deployment (Vercel)

1. Provision PostgreSQL (Supabase recommended) and set `DATABASE_URL`/`DIRECT_URL`.
2. Add all production env vars in Vercel → Settings → Environment Variables.
3. `npx prisma migrate deploy` against the production database.
4. Configure webhook endpoints in each gateway dashboard:
   - Stripe: `https://your-domain/api/payments/webhook/stripe` → `checkout.session.completed`
   - Paystack: `…/api/payments/webhook/paystack`
   - Flutterwave: `…/api/payments/webhook/flutterwave`
5. Supabase Storage: create **private** buckets `product-images` and `campaign-lookbooks`.
6. First deploy: sign in at `/admin/login` with the invite code, then rotate it.
7. Verify `npm run build` passes locally before pushing (CI-safe without a DB).

## 8. Known Development Notes

- Seed imagery uses Unsplash editorial stand-ins; replace via admin uploads.
- Corridor currency conversion uses static demo rates in `gateway.ts` — wire a
  live FX source before multi-currency launch.
- Stripe runs in hosted-checkout mode; the client-secret field is reserved for
  a future embedded Elements flow.
