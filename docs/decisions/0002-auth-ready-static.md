# Auth-ready static v1; later lock is magic link + remap

**Status:** **Superseded** (19 Aug 2026) by [0004-auth-at-persistence.md](0004-auth-at-persistence.md). Keep this file for history. Do not implement the open `DEFAULT_OWNER_ID` policy or a later Phase 4b remap.

v1 originally had **no login wall**. The Owner used BodyPlan as a personal tool on a public Pages URL. Architecture was **auth-ready**: every personal row has `owner_id`, all access goes through the **data gateway**, and v1 inserts/selects used a committed **`DEFAULT_OWNER_ID`**. When the Owner asked to lock it, **Phase 4b** would enable Supabase Auth **email magic link**, remap `DEFAULT_OWNER_ID` → `auth.uid()`, and tighten RLS.

Revision 5 **rejects** shipping that open policy. Phase 4 implements magic link **with** persistence. `DEFAULT_OWNER_ID` is test/fixture only. See ADR 0004.

## v1 shape (so Phase 4b is a remap, not a rewrite)

1. **Data gateway** — only `src/data/*` imports `supabase-js`. Pages, components, and `src/engine` never call `.from()`.
2. **`owner_id uuid not null`** on every personal table (`profiles`, `goals`, `plans`, `plan_versions`, `day_plans`, `meal_slots`, `workout_sessions`, `workout_items`, `check_ins`, `favorites`).
3. **`DEFAULT_OWNER_ID`** — a real UUID generated once and committed (`src/data/owner.ts`). `getOwnerId()` returns that UUID. Phase 4b deletes the constant and reads the session instead.
4. **One profile per owner** — `unique (owner_id)` on `profiles`, not a database that can only ever hold one row.
5. **RLS on from the first migration.** v1 policy: `anon` and `authenticated` may touch rows where `owner_id = DEFAULT_OWNER_ID`. Document it in `supabase/policies.sql`.
6. **No `auth.users` foreign key in v1.** `owner_id` is a UUID column. Phase 4b may add the FK after the first real user id exists.
7. **Catalog vs personal data** — recipes and exercises are not personal (git JSON). Swaps and pins are personal rows.
8. **Session-shaped client now** — `createBrowserClient()` is a function, so Phase 4b can attach `Authorization: Bearer <jwt>` without touching screens.
9. **Routes stay usable without a session** — no `/login` in v1; `/plan` works as long as `getOwnerId()` returns a UUID. `/lock` is Phase 4b only.
10. **Anon key is public; `service_role` never ships in the website.**

Until Phase 4b, anyone who finds the Pages URL can use the public anon key against the same personal rows. That is accepted for this personal tool. Body-comp data is still sensitive — hence the bolt-on lock, not a shrug.

## Phase 4b remap (run only after the Owner asks)

Prefer a **one-off SQL remap**, not an `auth.users` id override, and not a UI button that can run twice:

```sql
-- Conceptual. Bind the real UUIDs when Phase 4b runs.
update profiles           set owner_id = '<auth uid>' where owner_id = '<DEFAULT_OWNER_ID>';
update goals              set owner_id = '<auth uid>' where owner_id = '<DEFAULT_OWNER_ID>';
update plans              set owner_id = '<auth uid>' where owner_id = '<DEFAULT_OWNER_ID>';
update plan_versions      set owner_id = '<auth uid>' where owner_id = '<DEFAULT_OWNER_ID>';
update day_plans          set owner_id = '<auth uid>' where owner_id = '<DEFAULT_OWNER_ID>';
update meal_slots         set owner_id = '<auth uid>' where owner_id = '<DEFAULT_OWNER_ID>';
update workout_sessions   set owner_id = '<auth uid>' where owner_id = '<DEFAULT_OWNER_ID>';
update workout_items      set owner_id = '<auth uid>' where owner_id = '<DEFAULT_OWNER_ID>';
update check_ins          set owner_id = '<auth uid>' where owner_id = '<DEFAULT_OWNER_ID>';
update favorites          set owner_id = '<auth uid>' where owner_id = '<DEFAULT_OWNER_ID>';
```

Then:

1. Enable Email (magic link) in the Supabase project — one account.
2. Settings (or `/lock`) sign-in via Supabase Auth. First-party server callbacks are not available on Pages; **Supabase Auth**, not NextAuth.
3. After the remap, replace the open anon policy with `owner_id = auth.uid()`. Revoke the v1 open policy.
4. `getOwnerId()` reads `session.user.id` and throws if missing.
5. Prove with an incognito window that signed-out anon cannot read/write personal rows.
6. Old `DEFAULT_OWNER_ID` rows are remapped, not orphaned.

A second person with their own plan is further planning: the same RLS already allows a new `profiles` row for a new `owner_id`. Do not build that UI in v1.

## Considered options

- **NextAuth.js / Auth.js + Prisma adapter** — rejected. Needs a first-party Node server for OAuth callbacks; Pages has none. If auth is added, it is Supabase Auth.
- **Login wall in v1** — rejected by the Owner. Design auth-ready; ship without the wall.
- **Google / Apple OAuth as the first lock** — rejected for the first lock. Magic link is enough unless the Owner changes it later.
- **Keep `DEFAULT_OWNER_ID` forever and force `auth.users` id to match** — possible but worse operationally. Prefer SQL remap of rows to `auth.uid()`.

## Consequences

- Phase 4 implements persistence **without** a sign-in screen and **without** blocking on credentials for a lock that is not in v1.
- E2E should use `DEFAULT_OWNER_ID` (or a stubbed gateway), not a fake auth bypass that Phase 4b would have to rip out.
- Settings may grow a quiet “Lock this data later” note; it must not look like a broken button in v1.
- Leaked old JS bundles with an old anon policy, key rotation, and multi-user onboarding are further planning (§3 item 19).
