"use client";

/**
 * AdminNav — sidebar navigation with active-route states (desktop sidebar
 * + mobile top bar variant). Inline SVG icons, no emoji, 44px touch targets.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  {
    href: "/admin",
    label: "Control Room",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    href: "/admin/products",
    label: "Catalog",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
        <path d="M3.5 8.5L12 13l8.5-4.5" />
        <path d="M12 13v9" />
      </svg>
    ),
  },
  {
    href: "/admin/categories",
    label: "Category names",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M4 6h16M4 12h10M4 18h7" />
        <circle cx="19" cy="16" r="3" />
      </svg>
    ),
  },
  {
    href: "/admin/assistant",
    label: "Studio Copilot",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="4" y="6" width="16" height="12" rx="3" />
        <circle cx="9.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="14.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
        <path d="M12 6V3" />
        <circle cx="12" cy="2" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
] as const;

export function AdminNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  if (mobile) {
    return (
      <nav aria-label="Admin" className="flex items-center gap-1">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              title={item.label}
              className={`flex h-11 w-11 items-center justify-center transition-colors duration-200 ${
                active ? "bg-white/10 text-brass" : "text-concrete hover:text-charcoal"
              }`}
            >
              <span className="h-5 w-5 [&>svg]:h-full [&>svg]:w-full">{item.icon}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Admin" className="px-3">
      <p className="label-rohde px-3 pb-3">Studio</p>
      <ul className="space-y-1">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group flex min-h-11 items-center gap-3 px-3 text-sm transition-colors duration-200 ${
                  active
                    ? "border-l-2 border-brass bg-white/5 text-charcoal"
                    : "border-l-2 border-transparent text-concrete hover:bg-white/5 hover:text-charcoal"
                }`}
              >
                <span className={`h-5 w-5 shrink-0 [&>svg]:h-full [&>svg]:w-full ${active ? "text-brass" : ""}`}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
