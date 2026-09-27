import type { Metadata } from "next";
import { CopilotChat } from "@/components/admin/CopilotChat";

export const metadata: Metadata = { title: "Studio Copilot", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function AdminAssistantPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <header className="mb-8">
        <p className="label-rohde">Rohde Studio · AI Assistant</p>
        <h1 className="mt-2 font-display text-2xl font-bold uppercase tracking-tighter2 text-charcoal md:text-3xl">
          Studio Copilot
        </h1>
        <p className="mt-2 text-sm text-concrete">
          Exact stock, prices and restock lists on request — or ask it to adjust
          inventory. Every write is audit-logged under your account.
        </p>
      </header>

      <main className="flex flex-1 flex-col">
        <CopilotChat />
      </main>
    </div>
  );
}
