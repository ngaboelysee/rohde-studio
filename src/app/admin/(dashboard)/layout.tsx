import { OrbitLogo } from "@/components/brand/OrbitLogo";
import { AdminNav } from "@/components/admin/AdminNav";
import { getAdminSession } from "@/lib/admin-session";

// Admin lives entirely outside the storefront chrome: no storefront Header,
// Footer, Concierge or WhatsApp button. The root layout renders those, so
// this segment layout suppresses them by supplying its own <main> shell.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Middleware guarantees a session for every child of /admin except login.
  const session = await getAdminSession();
  const name = session?.name ?? session?.email ?? "Studio";
  const role = session?.role ?? "STAFF";

  return (
    <div className="min-h-screen bg-bone">
      {/* ── Sidebar (desktop) / top bar (mobile) ─────────────────────── */}
      <div className="lg:pl-64">
        {/* Sidebar — fixed, hairline separation, brass for presence */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/10 bg-bone-deep lg:flex">
          <div className="flex h-16 items-center border-b border-white/10 px-6 text-charcoal">
            <OrbitLogo size={24} />
          </div>

          <div className="flex-1 overflow-y-auto py-6">
            <AdminNav />
          </div>

          <div className="border-t border-white/10 px-6 py-5">
            <p className="text-sm font-semibold text-charcoal">{name}</p>
            <p className="label-rohde mt-0.5">{role}</p>
          </div>
        </aside>
      </div>

      {/*
        Content column. Top padding compensates for the fixed mobile bar
        (ui-ux-pro-max: fixed nav must never obscure page content).
      */}
      <div className="lg:pl-64 pt-16 lg:pt-0">
        {/* Mobile top bar */}
        <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-bone-deep px-5 lg:hidden">
          <OrbitLogo size={20} />
          <div className="flex items-center gap-4">
            <AdminNav mobile />
          </div>
        </header>

        <main id="main-content" className="px-5 pb-16 pt-8 md:px-8 md:pt-10">
          {children}
        </main>
      </div>
    </div>
  );
}
