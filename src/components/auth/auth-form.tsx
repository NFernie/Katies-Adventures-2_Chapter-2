"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  MIN_PASSWORD_LENGTH,
  sendMagicLink,
  signInWithEmail,
  signUpWithEmail,
} from "@/data";

type AuthMode = "signin" | "signup";

export function AuthForm({
  redirectOnSend = true,
  emailRedirectTo,
  defaultMode = "signin",
}: {
  redirectOnSend?: boolean;
  emailRedirectTo?: string;
  defaultMode?: AuthMode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryBusy, setRecoveryBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSent(false);
    setSignedIn(false);
    try {
      if (mode === "signup") {
        await signUpWithEmail(email.trim(), password, { emailRedirectTo });
        setSent(true);
        if (redirectOnSend) {
          router.push("/lock");
        }
      } else {
        await signInWithEmail(email.trim(), password);
        setSignedIn(true);
        if (redirectOnSend) {
          router.push("/");
        }
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : mode === "signup"
            ? "Could not create the account."
            : "Could not sign in.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onRecovery() {
    setRecoveryBusy(true);
    setError(null);
    try {
      await sendMagicLink(email.trim(), { emailRedirectTo });
      setSent(true);
      if (redirectOnSend) {
        router.push("/lock");
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not email a one-time link.",
      );
    } finally {
      setRecoveryBusy(false);
    }
  }

  const submitLabel =
    mode === "signup"
      ? busy
        ? "Sending link…"
        : "Create account"
      : busy
        ? "Signing in…"
        : "Sign in";

  return (
    <form onSubmit={onSubmit} className="mt-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Account">
        {(["signin", "signup"] as const).map((next) => (
          <button
            key={next}
            type="button"
            role="tab"
            aria-selected={mode === next}
            onClick={() => {
              setMode(next);
              setError(null);
              setSent(false);
              setSignedIn(false);
            }}
            className={`min-h-11 rounded-full border-[1.5px] border-iron px-3.5 font-semibold ${
              mode === next ? "bg-iron text-chalk" : "bg-transparent text-iron"
            }`}
          >
            {next === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <p className="mt-3 font-sans text-[16px] leading-[1.45] text-iron-2">
        {mode === "signup"
          ? "New email. We send a confirmation link. After you open it, sign in here — no more links."
          : "Already confirmed? Email and password. We do not send a new link."}
      </p>
      <label className="mt-4 block font-sans text-[14px] font-semibold" htmlFor="auth-email">
        Email
        <input
          id="auth-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="mt-1.5 min-h-12 w-full rounded-[4px] border border-iron bg-white px-3 font-sans text-[1.15rem] font-semibold"
        />
      </label>
      <label className="mt-4 block font-sans text-[14px] font-semibold" htmlFor="auth-password">
        Password
        <span className="relative mt-1.5 block">
          <input
            id="auth-password"
            name={mode === "signup" ? "new-password" : "password"}
            type={showPassword ? "text" : "password"}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "auth-error" : "auth-password-hint"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-12 w-full rounded-[4px] border border-iron bg-white px-3 pr-24 font-sans text-[1.15rem] font-semibold"
          />
          <button
            type="button"
            className="absolute top-0 right-0 min-h-12 min-w-11 px-3 font-sans text-[14px] font-semibold"
            onClick={() => setShowPassword((current) => !current)}
            aria-pressed={showPassword}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </span>
      </label>
      <p id="auth-password-hint" className="mt-1.5 font-sans text-[14px] leading-snug text-iron-2">
        At least {MIN_PASSWORD_LENGTH} characters. Paste is allowed.
      </p>
      <Button type="submit" disabled={busy} className="mt-2 w-full">
        {submitLabel}
      </Button>
      {error ? (
        <p
          id="auth-error"
          role="alert"
          className="mt-2 font-sans text-[14px] text-alert"
        >
          {error}
        </p>
      ) : null}
      {signedIn && !redirectOnSend ? (
        <p role="status" className="mt-2 font-sans text-[14px] leading-snug text-iron-2">
          You are in. Generate or open You.
        </p>
      ) : null}
      {sent && !redirectOnSend ? (
        <p role="status" className="mt-2 font-sans text-[14px] leading-snug text-iron-2">
          Link sent. Open it on this phone, then sign in with the same email and
          password.
        </p>
      ) : null}
      <details className="mt-4">
        <summary className="min-h-11 cursor-pointer font-sans text-[14px] font-semibold">
          Email a one-time link
        </summary>
        <p className="mt-2 font-sans text-[14px] leading-snug text-iron-2">
          For a confirmed email that never got a password. After you open the
          link, set a password on You. New accounts should use Create account.
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={recoveryBusy || !email.trim()}
          className="mt-2 w-full"
          onClick={() => void onRecovery()}
        >
          {recoveryBusy ? "Sending…" : "Email a one-time link"}
        </Button>
      </details>
    </form>
  );
}
