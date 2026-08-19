import { BASE_PATH } from "@/config/site";

import { createBrowserClient } from "./client";
import { GatewayError } from "./errors";
import type { AuthClient, Session } from "./gateway-client";

function asAuthClient(client?: AuthClient): AuthClient {
  return client ?? (createBrowserClient() as unknown as AuthClient);
}

function sitePathUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") {
    return `${BASE_PATH}${suffix}`;
  }
  return `${window.location.origin}${BASE_PATH}${suffix}`;
}

export function lockRedirectUrl(): string {
  return sitePathUrl("/lock/");
}

export function onboardingRedirectUrl(): string {
  return sitePathUrl("/onboarding/");
}

export const MAGIC_LINK_SENT_KEY = "bodyplan-magic-link-sent";

export async function sendMagicLink(
  email: string,
  options?: { client?: AuthClient; emailRedirectTo?: string },
): Promise<void> {
  const client = asAuthClient(options?.client);
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: options?.emailRedirectTo ?? lockRedirectUrl(),
      shouldCreateUser: true,
    },
  });
  if (error) throw new GatewayError(error.message);
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(MAGIC_LINK_SENT_KEY, "1");
  }
}

export async function getSession(
  client?: AuthClient,
): Promise<Session | null> {
  const { data } = await asAuthClient(client).auth.getSession();
  return data.session;
}

export async function signOut(client?: AuthClient): Promise<void> {
  const { error } = await asAuthClient(client).auth.signOut();
  if (error) throw new GatewayError(error.message);
}

function parseAuthHref(href: string): {
  tokenHash: string | null;
  type: string | null;
  code: string | null;
  errorDescription: string | null;
} {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const pick = (name: string) => url.searchParams.get(name) ?? hash.get(name);
  const errorDescription = pick("error_description");
  return {
    tokenHash: pick("token_hash"),
    type: pick("type"),
    code: pick("code"),
    errorDescription: errorDescription
      ? decodeURIComponent(errorDescription.replace(/\+/g, " "))
      : null,
  };
}

function stripAuthParamsFromWindow(): void {
  if (typeof window === "undefined" || typeof history === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("token_hash");
  url.searchParams.delete("type");
  url.searchParams.delete("error_description");
  url.hash = "";
  const next = `${url.pathname}${url.search}`;
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== next) {
    window.history.replaceState({}, "", next);
  }
}

/** Turn the emailed magic-link URL into a persisted session. */
export async function completeAuthFromUrl(options?: {
  client?: AuthClient;
  href?: string;
}): Promise<Session | null> {
  if (options?.href) {
    return runCompleteAuthFromUrl(options);
  }
  if (!inflightComplete) {
    inflightComplete = runCompleteAuthFromUrl(options).finally(() => {
      inflightComplete = null;
    });
  }
  return inflightComplete;
}

let inflightComplete: Promise<Session | null> | null = null;

async function runCompleteAuthFromUrl(options?: {
  client?: AuthClient;
  href?: string;
}): Promise<Session | null> {
  const client = asAuthClient(options?.client);
  const href =
    options?.href ??
    (typeof window !== "undefined" ? window.location.href : "");
  if (!href) return getSession(client);

  let parsed: ReturnType<typeof parseAuthHref>;
  try {
    parsed = parseAuthHref(href);
  } catch {
    return getSession(client);
  }

  if (parsed.errorDescription) {
    throw new GatewayError(parsed.errorDescription);
  }

  const existing = await getSession(client);
  if (existing) {
    stripAuthParamsFromWindow();
    return existing;
  }

  if (parsed.tokenHash && client.auth.verifyOtp) {
    const { error } = await client.auth.verifyOtp({
      token_hash: parsed.tokenHash,
      type: parsed.type || "magiclink",
    });
    if (error) throw new GatewayError(error.message);
    stripAuthParamsFromWindow();
    return getSession(client);
  }

  if (parsed.code && client.auth.exchangeCodeForSession) {
    const { error } = await client.auth.exchangeCodeForSession(parsed.code);
    if (error) throw new GatewayError(error.message);
    stripAuthParamsFromWindow();
    return getSession(client);
  }

  const session = await getSession(client);
  if (session) stripAuthParamsFromWindow();
  return session;
}

export function subscribeToSession(
  listener: (session: Session | null) => void,
  client?: AuthClient,
): () => void {
  const authClient = asAuthClient(client);
  let cancelled = false;
  void completeAuthFromUrl({ client: authClient })
    .then((session) => {
      if (!cancelled) listener(session);
    })
    .catch(async () => {
      if (cancelled) return;
      listener(await getSession(authClient));
    });
  const sub = authClient.auth.onAuthStateChange?.((_event, session) => {
    listener(session);
  });
  return () => {
    cancelled = true;
    sub?.data?.subscription?.unsubscribe();
  };
}
