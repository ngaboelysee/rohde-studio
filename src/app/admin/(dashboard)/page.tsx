import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-session";
import { formatPrice, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "border-brass/40 bg-brass/10 text-brass",
  PAID: "border-success/40 bg-success/10 text-emerald-300",
  FULFILLED: "border-success/40 bg-success/10 text-emerald-300",
  FAILED: "border-error/40 bg-error/10 text-red-300",
  CANCELLED: "border-white/20 bg-white/5 text-concrete",
};

function statusStyle(status: string): string {
  return STATUS_STYLES[status] ?? "border-white/20 bg-white/5 text-concrete";
}

export default async function AdminDashboardPage() {
  const session = await getAdminSession();

  const [productCount, activeCount, pendingOrders, paidOrders, lowStock, recentOrders, revenueAgg] =
    await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { status: "ACTIVE" } }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "PAID" } }),
      prisma.inventory.findMany({
        where: { onHand: { lte: 3 } },
        include: { variant: { include: { product: true } } },
        take: 8,
        orderBy: { onHand: "asc" },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { items: true },
      }),
      prisma.payment.aggregate({ where: { status: "CAPTURED" }, _sum: { amount: true } }),
    ]);

  const revenue = revenueAgg._sum.amount ?? 0;

  const kpis = [
    {
      label: "Revenue (captured)",
      value: formatPrice(revenue),
      hint: "All gateways",
      accent: "text-brass",
    },
    {
      label: "Active products",
      value: `${activeCount}`,
      hint: `${productCount} total`,
      accent: "text-charcoal",
    },
    {
      label: "Pending orders",
      value: String(pendingOrders),
      hint: pendingOrders > 0 ? "Needs attention" : "All clear",
      accent: pendingOrders > 0 ? "text-brass" : "text-concrete",
    },
    {
      label: "Paid orders",
      value: String(paidOrders),
      hint: paidOrders > 0 ? "Ready to fulfil" : "None yet",
      accent: "text-emerald-300",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-rohde">Rohde Studio · Control Room</p>
          <h1 className="mt-2 font-display text-2xl font-bold uppercase tracking-tighter2 text-charcoal md:text-3xl">
            Overview
          </h1>
        </div>
        <p className="text-sm text-concrete">
          Welcome back, <span className="text-charcoal">{session?.name ?? session?.email}</span>
        </p>
      </header>

      {/* ── KPI cards — one signal per card, color = meaning ────────── */}
      <section aria-label="Key metrics" className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="border border-white/10 bg-bone-raised p-5 transition-colors duration-300 hover:border-white/20"
          >
            <p className="label-rohde">{kpi.label}</p>
            <p className={`mt-3 font-display text-3xl font-bold tracking-tighter2 ${kpi.accent}`}>
              {kpi.value}
            </p>
            <p className="mt-1 text-xs text-concrete">{kpi.hint}</p>
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-8 xl:grid-cols-5">
        {/* ── Stock health — semantic color: red=sold out, brass=low ── */}
        <section aria-labelledby="stock-heading" className="xl:col-span-3">
          <div className="flex items-center justify-between">
            <h2 id="stock-heading" className="label-rohde">
              Stock health
            </h2>
            <Link href="/admin/products" className="text-xs text-brass transition-colors duration-200 hover:text-charcoal">
              Manage catalog →
            </Link>
          </div>
          <div className="mt-4 divide-y divide-white/5 border border-white/10 bg-bone-raised">
            {lowStock.length === 0 ? (
              <p className="px-5 py-8 text-sm text-concrete">All stock levels healthy.</p>
            ) : (
              lowStock.map((inv) => {
                const max = Math.max(inv.onHand, 3);
                return (
                  <div key={inv.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-charcoal">{inv.variant.product.name}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-concrete">
                        {inv.variant.sku} · {inv.variant.size} · {inv.variant.color}
                      </p>
                    </div>
                    <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${inv.onHand === 0 ? "bg-error" : "bg-brass"}`}
                        style={{ width: `${Math.max((inv.onHand / max) * 100, inv.onHand === 0 ? 100 : 8)}%` }}
                      />
                    </div>
                    <span
                      className={`w-14 shrink-0 text-right font-mono text-sm font-bold ${
                        inv.onHand === 0 ? "text-red-300" : "text-brass"
                      }`}
                    >
                      {inv.onHand === 0 ? "OUT" : inv.onHand}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ── Copilot callout ────────────────────────────────────────── */}
        <section aria-labelledby="copilot-heading" className="xl:col-span-2">
          <h2 id="copilot-heading" className="label-rohde">
            AI Studio Copilot
          </h2>
          <div className="mt-4 border border-brass/25 bg-gradient-to-b from-brass/10 to-transparent p-6">
            <p className="text-sm leading-relaxed text-charcoal">
              Ask for exact stock counts, prices, restock lists — or have it adjust
              inventory for you. Every write is audit-logged.
            </p>
            <Link
              href="/admin/assistant"
              className="mt-5 inline-flex min-h-11 items-center border border-brass/50 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-widest2 text-brass transition-colors duration-300 hover:bg-brass hover:text-bone"
            >
              Open Copilot →
            </Link>
          </div>
        </section>
      </div>

      {/* ── Recent orders ───────────────────────────────────────────── */}
      <section aria-labelledby="orders-heading" className="mt-8">
        <h2 id="orders-heading" className="label-rohde">
          Recent orders
        </h2>
        <div className="mt-4 overflow-x-auto border border-white/10 bg-bone-raised">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                {["Order", "Customer", "Date", "Total", "Status"].map((h) => (
                  <th key={h} scope="col" className="px-5 py-3 label-rohde font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-concrete">
                    No orders yet — they will land here in real time.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="transition-colors duration-200 hover:bg-white/[0.03]">
                    <td className="px-5 py-3.5 font-mono text-xs text-charcoal">{order.orderNumber}</td>
                    <td className="px-5 py-3.5 text-concrete">{order.email}</td>
                    <td className="px-5 py-3.5 text-concrete">{formatDate(order.createdAt)}</td>
                    <td className="px-5 py-3.5 font-semibold text-charcoal">
                      {formatPrice(order.total, order.currency)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider2 ${statusStyle(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
