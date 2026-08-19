/**
 * Session-shaped data gateway stub. Screens and the engine must not import supabase-js.
 * Persistence is Phase 4. This throws until then so missing env cannot silently no-op.
 */
export function getSupabaseBrowserClient(): never {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. Persistence lands in Phase 4. Never use service_role in the website.",
    );
  }

  throw new Error(
    "The data gateway is not wired yet (Phase 4). Env is present; do not call this from screens until src/data implements supabase-js.",
  );
}
