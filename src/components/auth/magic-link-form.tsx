"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { sendMagicLink } from "@/data";

export function MagicLinkForm({
  redirectOnSend = true,
  emailRedirectTo,
}: {
  redirectOnSend?: boolean;
  emailRedirectTo?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await sendMagicLink(email.trim(), { emailRedirectTo });
      setSent(true);
      if (redirectOnSend) {
        router.push("/lock");
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not send the magic link.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4">
      <label className="block font-sans text-[14px] font-semibold" htmlFor="magic-email">
        Email for magic link
        <input
          id="magic-email"
          type="email"
          required
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "magic-link-error" : undefined}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="mt-1.5 min-h-12 w-full rounded-[4px] border border-iron bg-white px-3 font-sans text-[1.15rem] font-semibold"
        />
      </label>
      <Button type="submit" disabled={busy} className="mt-2 w-full">
        {busy ? "Sending…" : "Send magic link"}
      </Button>
      {error ? (
        <p
          id="magic-link-error"
          role="alert"
          className="mt-2 font-sans text-[14px] text-alert"
        >
          {error}
        </p>
      ) : null}
      {sent && !redirectOnSend ? (
        <p role="status" className="mt-2 font-sans text-[14px] leading-snug text-iron-2">
          Link sent. Open it on this phone, then generate.
        </p>
      ) : null}
      <p className="mt-3 font-sans text-[14px] leading-snug text-iron-2">
        No Google, no password. We email a one-time link. Open it on this
        device.
      </p>
    </form>
  );
}
