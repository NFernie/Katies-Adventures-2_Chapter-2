import { BASE_PATH } from "@/config/site";

import { createBrowserClient } from "./client";
import { GatewayError } from "./errors";
import type { AuthClient, Session } from "./gateway-client";

function asAuthClient(client?: AuthClient): AuthClient {
  return client ?? (createBrowserClient() as unknown as AuthClient);
}

export function lockRedirectUrl(): string {
  if (typeof window === "undefined") {
    return `${BASE_PATH}/lock/`;
  }
  return `${window.location.origin}${BASE_PATH}/lock/`;
}

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

export function subscribeToSession(
  listener: (session: Session | null) => void,
  client?: AuthClient,
): () => void {
  const authClient = asAuthClient(client);
  void authClient.auth.getSession().then(({ data }) => listener(data.session));
  const sub = authClient.auth.onAuthStateChange?.((_event, session) => {
    listener(session);
  });
  return () => sub?.data?.subscription?.unsubscribe();
}
