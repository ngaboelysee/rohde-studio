"use client";

/**
 * CopilotChat — admin-side AI chat for inventory management.
 * Same tool-calling contract as the storefront concierge, but scoped to
 * staff: verbatim inventory facts in, audited writes out.
 */
import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What's low on stock right now?",
  "How many Orbit Puffer Jackets are available and at what price?",
  "What is sold out?",
] as const;

export function CopilotChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;

    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-12) }),
      });

      if (res.status === 404) {
        setMessages([...next, { role: "assistant", content: "Your session has expired — sign in again." }]);
        return;
      }

      const data = await res.json().catch(() => null);
      const reply =
        typeof data?.reply === "string" && data.reply
          ? data.reply
          : "The Copilot is momentarily unavailable — inventory data itself is unaffected.";

      setMessages([...next, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Connection issue — try again in a moment." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col border border-white/10 bg-bone-raised">
      <div
        ref={listRef}
        aria-live="polite"
        className="flex-1 space-y-5 overflow-y-auto scroll-rohde px-5 py-6 md:px-6"
        style={{ minHeight: "20rem", maxHeight: "34rem" }}
      >
        {messages.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-concrete">Try one of these, or ask anything about the catalog:</p>
            <div className="flex flex-wrap gap-3">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="min-h-11 border border-white/15 px-4 py-2 text-xs text-concrete transition-colors duration-200 hover:border-brass/60 hover:text-brass"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <p className="label-rohde mb-1">{m.role === "user" ? "You" : "Copilot"}</p>
              <p
                className={`inline-block max-w-[85%] whitespace-pre-wrap px-5 py-3 text-sm leading-relaxed ${
                  m.role === "user" ? "bg-brass text-bone-deep" : "border border-white/10 text-charcoal"
                }`}
              >
                {m.content}
              </p>
            </div>
          ))
        )}
        {busy ? (
          <p className="label-rohde" role="status">
            Checking the ledger…
          </p>
        ) : null}
      </div>

      <form
        className="flex gap-3 border-t border-white/10 px-5 py-4 md:px-6"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label className="sr-only" htmlFor="copilot-input">
          Message the Studio Copilot
        </label>
        <input
          id="copilot-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. set RHD-ORB-PUF-MC-01 to 12"
          maxLength={500}
          className="min-h-11 flex-1 border border-white/15 bg-transparent px-4 text-sm text-charcoal transition-colors duration-200 placeholder:text-concrete/60 focus:border-brass focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="min-h-11 border border-brass/50 px-8 text-[11px] font-semibold uppercase tracking-widest2 text-brass transition-colors duration-200 hover:bg-brass hover:text-bone disabled:opacity-40"
        >
          {busy ? "···" : "Send"}
        </button>
      </form>
    </div>
  );
}
