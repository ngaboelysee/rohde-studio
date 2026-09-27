"use client";

/**
 * Admin login — verifies credentials through Supabase Auth via the server
 * route, which then issues the admin session cookie. On failure this page
 * looks like a generic sign-in; the route itself is gated by middleware.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsInvite, setNeedsInvite] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      inviteCode: String(formData.get("inviteCode") ?? "") || undefined,
    };

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok?: boolean; bootstrap?: boolean; error?: string };

      if (!res.ok || !json.ok) {
        setError(json.error ?? "Invalid credentials");
        setLoading(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Network error — try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bone px-6 text-charcoal dark-focus">
      <div className="w-full max-w-sm">
        <p className="text-[11px] uppercase tracking-widest2 text-concrete">Rohde Studio</p>
        <h1 className="mt-3 text-3xl font-bold uppercase tracking-tighter2">Staff access</h1>

        <form onSubmit={onSubmit} noValidate className="mt-10 space-y-5" aria-label="Staff sign in">
          <DarkFormField label="Email" name="email" type="email" autoComplete="email" required />
          <DarkFormField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          <DarkFormField
            label="Invite code (first login only)"
            name="inviteCode"
            hint="Required once, when bootstrapping the owner account"
          />
          {error ? (
            <p role="alert" className="text-sm font-medium text-red-400">
              {error}
            </p>
          ) : null}
          <Button type="submit" loading={loading} className="w-full !bg-void !text-offwhite hover:!text-brass-deep">
            Enter
          </Button>
        </form>
        {needsInvite ? null : null}
      </div>
    </div>
  );
}

/** Dark-theme variant of the form field for the admin shell. */
function DarkFormField(props: React.ComponentProps<"input"> & { label: string; hint?: string }) {
  const { label, hint, id, ...rest } = props;
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      <label htmlFor={fieldId} className="mb-2 block text-[11px] font-semibold uppercase tracking-widest2 text-concrete">
        {label}
      </label>
      <input
        id={fieldId}
        className="w-full border border-charcoal/25 bg-transparent px-4 py-3 text-sm text-charcoal placeholder:text-concrete transition-colors duration-300 focus:border-brass focus:outline-none focus-visible:outline-none"
        aria-describedby={hint ? `${fieldId}-hint` : undefined}
        {...rest}
      />
      {hint ? (
        <p id={`${fieldId}-hint`} className="mt-1.5 text-xs text-concrete">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
