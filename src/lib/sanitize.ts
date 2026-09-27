/**
 * Input defense — server-side DOMPurify (jsdom window) + text escaping.
 * Every untrusted string that reaches storage or renders as HTML passes
 * through these helpers first.
 */
import "server-only";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

/** Sanitize rich text while stripping scripts, event handlers, and dangerous URLs. */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br", "ul", "ol", "li", "a"],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOW_DATA_ATTR: false,
  });
}

/** Escape a plain-text field: collapses whitespace and strips angle brackets. */
export function sanitizeText(input: string, maxLength = 2000): string {
  const collapsed = input.replace(/\s+/g, " ").trim();
  const stripped = collapsed.replace(/[<>]/g, "");
  return stripped.slice(0, maxLength);
}

/** Validate + normalize an email address. */
export function sanitizeEmail(input: string): string {
  const email = input.trim().toLowerCase().slice(0, 320);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new Error("Invalid email address");
  }
  return email;
}
