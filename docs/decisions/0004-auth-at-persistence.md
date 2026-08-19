# ADR 0004: Auth at persistence

**Status:** Accepted (2026-08-19). **Supersedes** [0002-auth-ready-static.md](0002-auth-ready-static.md). Phase 4b is not a later optional remap.

## Context

Revision 2 deferred a login wall and planned an optional Phase 4b to swap `DEFAULT_OWNER_ID` for `auth.uid()`. The owner now wants **email magic-link auth in the same phase as the data gateway**, so persistence is never shipped with an open single-owner policy.

## Decision

Phase 4 implements **Supabase Auth** together with the data gateway.

- Client: `@supabase/supabase-js`. **Create account** emails a confirmation magic link. **Sign in** is confirmed email + password (`signInWithPassword`). No Google OAuth, no NextAuth.
- Session: `getOwnerId()` returns `session.user.id` or **throws**. Production writes never use `DEFAULT_OWNER_ID`.
- RLS on every personal table: `authenticated` only, `owner_id = auth.uid()`. **Revoke** `anon`. No `is_v1_owner` open policy.
- `/lock` (or Settings) **is in v1**.
- Optional `owner_id uuid references auth.users(id)` when applying SQL in a project with Auth enabled.
- Pages stays a static export. Engine stays owner-agnostic. No `service_role` in the browser.

`DEFAULT_OWNER_ID` in `src/data/owner.ts` remains a **test/fixture** constant only.

**Amended (19 Aug 2026):** the owner rejected “every sign-in sends a new magic link.” Returning visits use a password after the email is confirmed. A one-time link remains only for confirmation and for accounts that never set a password.

## Consequences

- First applied migration must include auth-scoped RLS. Do not apply the old open policy, then “fix it in 4b”.
- E2E and launch checklists include a signed-in session (or a stubbed session in CI).
- Prototype copy must not teach a fake disabled login as the product.

## Alternatives rejected

- Keep open RLS until a later 4b (owner rejected).
- NextAuth + Prisma sessions (host cannot run a Node session server).
- Google OAuth in v1 (out of scope).
