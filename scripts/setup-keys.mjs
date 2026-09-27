#!/usr/bin/env node
/**
 * `npm run setup` — guided key-pasting wizard.
 *
 * Writes values straight into .env without ever displaying what is already
 * there. Re-run freely: only the keys you actually fill are written.
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ENV_PATH = join(process.cwd(), ".env");
const PLACEHOLDER_PATTERNS = [/^\s*$/, /^["']{2}$/, /your[-_]/i, /paste[-_]/i, /sk-or-…/i];

const FIELDS = [
  {
    key: "OPENROUTER_API_KEY",
    label: "OpenRouter (Atelier Concierge chatbot)",
    hint: "sk-or-v1-… — free at https://openrouter.ai/keys",
  },
  {
    key: "DATABASE_URL",
    label: "Supabase — pooled connection string (DATABASE_URL)",
    hint: "Project → Connect → Connection pooling → port 6543 URI",
  },
  {
    key: "DIRECT_URL",
    label: "Supabase — direct connection string (DIRECT_URL)",
    hint: "Project → Connect → Direct connection → port 5432 URI",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    label: "Supabase project URL",
    hint: "https://xxxx.supabase.co",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    label: "Supabase anon (public) key",
    label2: "",
    hint: "Project Settings → API → anon public",
  },
  {
    from: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    key: "SUPABASE_SERVICE_ROLE_KEY",
    label: "Supabase service_role key (server-only secret)",
    hint: "Project Settings → API → service_role (keep secret!)",
  },
];

function parseEnv(text) {
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) map.set(m[1], m[2]);
  }
  return map;
}

function isUnset(raw) {
  if (raw === undefined) return true;
  const v = raw.replace(/^["']|["']$/g, "").trim();
  return PLACEHOLDER_PATTERNS.some((re) => re.test(v));
}

async function main() {
  if (!existsSync(ENV_PATH)) {
    console.error("No .env found — copy .env.example to .env first.");
    process.exit(1);
  }
  const original = readFileSync(ENV_PATH, "utf8");
  const env = parseEnv(original);
  const rl = createInterface({ input: stdin, output: stdout });
  let written = [];

  console.log("\n── Rohde · key setup ───────────────────────────────────────\n");
  console.log("Press Enter to skip any field you do not have yet.\n");

  for (const f of FIELDS) {
    const current = env.get(f.key);
    const state = isUnset(current) ? "not set" : "already set ✓";
    const ans = (await rl.question(`• ${f.label} [${state}]\n  ${f.hint}\n  > `)).trim();
    if (!ans) continue;
    // Quote values that contain characters cmd-style env files dislike.
    const value = ans.includes(" ") ? `"${ans.replace(/^"|"$/g, "")}"` : ans;
    if (current === undefined) {
      env.set(f.key, value); // parser will append it below
      written.push(f.key);
    } else {
      env.set(f.key, value);
      written.push(f.key);
    }
  }

  rl.close();

  // Rebuild the file: replace known lines, append missing ones.
  const lines = original.split(/\r?\n/);
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=/);
    if (m && env.has(m[1])) {
      out.push(`${m[1]}=${env.get(m[1])}`);
      seen.add(m[1]);
    } else {
      out.push(line);
    }
  }
  for (const f of FIELDS) {
    if (!seen.has(f.key) && env.has(f.key)) {
      out.push(`${f.key}=${env.get(f.key)}`);
    }
  }

  writeFileSync(ENV_PATH, out.join("\n"), "utf8");
  console.log("\n✓ Written:", written.length ? written.join(", ") : "(nothing changed)");
  console.log("Next: restart the server, then I can run prisma migrate + seed against Supabase.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
