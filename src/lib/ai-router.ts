"server-only";

/**
 * OpenRouter chat-completions wrapper — shared by the storefront concierge
 * and the admin Studio Copilot. Keeps model fallback, timeouts and headers
 * in one place.
 */
import { env } from "@/lib/env";

export type ChatMessage = { role: string; content: unknown };

export type ToolSpec = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

// Free-tier fallback chain — spans providers; pin via OPENROUTER_MODEL.
const MODEL_CHAIN = [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "qwen/qwen3.8-27b:free",
  "inclusionai/ling-3.0-flash-sante:free",
  "nvidia/nemotron-3.5-lightning:free",
  "dots-studio/dots-3-note-preview:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
];

export type ChatCompletion = {
  ok: boolean;
  status?: number;
  json?: {
    choices?: Array<{ message?: { role: string; content?: string | null; tool_calls?: unknown[] } }>;
  };
};

export async function chatCompletion(
  messages: ChatMessage[],
  tools?: ToolSpec[]
): Promise<{ ok: boolean; status?: number; json?: any }> {
  if (!env.OPENROUTER_API_KEY) return { ok: false };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://rohde.studio",
        "X-Title": "Rohde Flagship",
      },
      body: JSON.stringify({
        model: env.OPENROUTER_MODEL ?? MODEL_CHAIN[0],
        messages,
        ...(tools && tools.length ? { tools } : {}),
        max_tokens: 500,
        temperature: 0.3,
        reasoning: { exclude: true },
      }),
    });
    const json = res.ok ? await res.json() : null;

    // A single pinned model has no fallback — surface failures immediately.
    if (env.OPENROUTER_MODEL) return { ok: res.ok, status: res.status, json };

    // Free models flap: on failure walk the rest of the chain once.
    if (!res.ok && MODEL_CHAIN.length > 1) {
      for (const model of MODEL_CHAIN.slice(1)) {
        const retry = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://rohde.studio",
            "X-Title": "Rohde Flagship",
          },
          body: JSON.stringify({
            model,
            messages,
            ...(tools && tools.length ? { tools } : {}),
            max_tokens: 500,
            temperature: 0.3,
            reasoning: { exclude: true },
          }),
        });
        if (retry.ok) return { ok: true, status: retry.status, json: await retry.json() };
      }
      return { ok: false, status: 502 };
    }

    return { ok: res.ok, status: res.status, json };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}
