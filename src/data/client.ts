import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

export type BodyPlanClient = SupabaseClient<Database>;

let browserClient: BodyPlanClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Session-shaped browser client. Attaches Authorization: Bearer <jwt> from
 * the persisted session. Only src/data may import supabase-js.
 */
export function createBrowserClient(): BodyPlanClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. See docs/wizard/supabase-pages.md. Never use service_role in the website.",
    );
  }

  if (anonKey.includes("service_role") || anonKey.startsWith("sb_secret_")) {
    throw new Error(
      "service_role / secret keys must not be used in the website. Use the anon or publishable key.",
    );
  }

  browserClient = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Static GitHub Pages has no server to hold a PKCE verifier. Magic-link
      // clicks from an email app would otherwise land signed-out on /lock/.
      flowType: "implicit",
    },
  });

  return browserClient;
}

/** @deprecated Use createBrowserClient. Kept so older imports still hit the same singleton. */
export function getSupabaseBrowserClient(): BodyPlanClient {
  return createBrowserClient();
}

export function resetBrowserClientForTests(): void {
  browserClient = null;
}
