"use client";

/**
 * Concierge — the Atelier Concierge chat widget (v2, tool-using).
 *
 * The server may attach `clientAction` payloads to tool results; this
 * component executes them against the live zustand cart store — the bag
 * visibly updates. Cart context ships with every request so the model can
 * answer "what's in my bag" and remove items by position.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCartStore } from "@/stores/cart-store";
import { trackEvent } from "@/lib/analytics/events";

const EASE = [0.16, 1, 0.3, 1] as const;

type Msg = { role: "user" | "assistant"; content: string; action?: string };
type ClientAction =
  | { action: "addToCart"; payload: Record<string, unknown> }
  | { action: "setQuantity"; index: number; quantity: number }
  | { action: "getCart" };

const GREETING: Msg = {
  role: "assistant",
  content:
    "Welcome to the atelier. I can show pieces, check sizes and stock, and add to your bag — try 'what's new?' or 'add the black tee in M'.",
};

const SUGGESTIONS = ["What's new?", "Show me hoodies under $350", "What's in my bag?"];

export function Concierge() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const lines = useCartStore((s) => s.lines);
  const cartAdd = useCartStore((s) => s.add);
  const cartSetQuantity = useCartStore((s) => s.setQuantity);
  const cartOpen = useCartStore((s) => s.open);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || busy) return;
      const next: Msg[] = [...messages, { role: "user", content: clean }];
      setMessages(next);
      setInput("");
      setBusy(true);
      trackEvent("search_performed", { contents: [] });

      try {
        const res = await fetch("/api/concierge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: next
              .filter((m) => m.content !== GREETING.content)
              .slice(-8)
              .map((m) => ({ role: m.role, content: m.content })),
            cart: lines.map((l) => ({
              productName: l.productName,
              size: l.size,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              currency: l.currency,
            })),
          }),
        });
        const json = (await res.json()) as {
          reply?: string;
          mode?: string;
          clientActions?: ClientAction[];
        };

        let actionNote: string | null = null;
        for (const act of json.clientActions ?? []) {
          if (act.action === "addToCart") {
            const r = cartAdd(act.payload as Parameters<typeof cartAdd>[0]);
            if (r.ok) actionNote = "Added to your bag —";
          } else if (act.action === "setQuantity") {
            const line = lines[act.index];
            if (line) {
              cartSetQuantity(line.variantId, act.quantity);
              actionNote = act.quantity <= 0 ? "Removed from your bag —" : "Bag updated —";
            }
          } else if (act.action === "getCart") {
            actionNote = lines.length
              ? lines.map((l) => `${l.productName} (${l.size}) × ${l.quantity}`).join(", ")
              : "Your bag is empty.";
          }
        }

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: json.reply ?? "The studio line at WhatsApp +250 781 214 230 can help directly.", action: actionNote ?? undefined },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "The concierge is unreachable — WhatsApp +250 781 214 230 reaches a human directly." },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [messages, busy, lines, cartAdd, cartSetQuantity]
  );

  return (
    <>
      {/* Launcher — bottom-left, away from the WhatsApp pill */}
      <motion.button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="concierge-panel"
        aria-label={open ? "Close concierge chat" : "Open concierge chat"}
        className="fixed bottom-6 left-5 z-40 flex h-12 items-center gap-2.5 border border-charcoal/15 bg-bone px-4 shadow-glow transition-colors duration-300 hover:border-brass/60"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z" />
        </svg>
        <span className="font-mono text-[10px] uppercase tracking-wider2">Concierge</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="concierge-panel"
            role="dialog"
            aria-label="Atelier Concierge"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="glass-nav fixed bottom-20 left-5 z-40 flex h-[min(540px,calc(100dvh-7.5rem))] w-[min(92vw,380px)] flex-col overflow-hidden border border-charcoal/15 shadow-glow-hover"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-charcoal/10 px-5 py-4">
              <div>
                <p className="text-sm font-medium tracking-wide">Atelier Concierge</p>
                <p className="label-rohde mt-0.5">Can search, size and add to your bag</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close concierge chat"
                className="skeuo-bar flex h-9 w-9 items-center justify-center text-sm text-concrete-dim transition-colors duration-300 hover:text-brass"
              >
                ✕
              </button>
            </div>

            {/* Thread */}
            <div ref={scrollRef} className="scroll-rohde flex-1 space-y-4 overflow-y-auto px-5 py-4" aria-live="polite">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] ${m.role === "user" ? "text-right" : ""}`}>
                    <p
                      className={`inline-block px-4 py-2.5 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "bg-void text-offwhite"
                          : "border border-charcoal/12 bg-transparent text-charcoal"
                      }`}
                    >
                      {m.content}
                    </p>
                    {m.action ? (
                      <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider2 text-brass">{m.action}</p>
                    ) : null}
                  </div>
                </div>
              ))}
              {busy ? (
                <div className="flex justify-start">
                  <p className="border border-charcoal/12 px-4 py-2.5 text-sm text-concrete-dim">···</p>
                </div>
              ) : null}
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
              className="border-t border-charcoal/10 px-5 py-4"
            >
              {messages.length === 1 && !busy ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="border border-charcoal/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider2 text-concrete-dim transition-colors duration-300 hover:border-brass/60 hover:text-brass"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask the atelier…"
                  aria-label="Message the concierge"
                  maxLength={1200}
                  className="w-full border border-charcoal/25 bg-transparent px-4 py-2.5 text-sm placeholder:text-concrete transition-colors duration-300 focus:border-brass focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  aria-label="Send message"
                  className="btn-charcoal shrink-0 !min-h-0 !px-4 !py-2.5"
                >
                  {busy ? "···" : "→"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
