# Launch (Phase 10)

BodyPlan is a **personal** planner on a **public** GitHub Pages URL. Auth is already the Phase 4 **email magic link**. There is no NextAuth, no Google OAuth, and no second login wall.

Owner launch approval is a **human** step. Merging this branch and using the live URL is that checkbox. An agent cannot grant it.

## Live URL

- Pages: `https://nfernie.github.io/Katies-Adventures-2_Chapter-2/`
- Local: `http://localhost:3000/Katies-Adventures-2_Chapter-2/`

`basePath` is `/Katies-Adventures-2_Chapter-2`. First-time Pages setup: [`wizard/github-pages.md`](./wizard/github-pages.md) or `bash scripts/wizard-github-pages.sh`.

The Pages URL is public even if the repo is unlisted. `robots.txt` and `noindex` ask crawlers not to list the app; they do not hide the URL.

## GitHub secrets and variables

The Pages workflow (`.github/workflows/pages.yml`) reads **secrets first**, then variables, and bakes `NEXT_PUBLIC_*` into the static export.

| Name | Where | Used for |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Actions **secrets** (optional duplicate as a **variable**) | Browser `supabase-js` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Actions **secrets** (optional duplicate as a **variable**) | Browser anon / publishable key |
| `USDA_FDC_API_KEY` | Actions **secrets** only | `npm run nutrition:check` in CI. **Never** `NEXT_PUBLIC_`. |

Never put `service_role`, `sb_secret_…`, the database password, or `DATABASE_URL` in the site, `.env.local`, or Pages env. Recheck: the Pages job greps `out/` for secret-key material and `service_role` JWTs.

Local copy: `.env.example` → `.env.local`. Click-through: [`wizard/supabase-pages.md`](./wizard/supabase-pages.md) or `bash scripts/wizard-supabase-pages.sh`.

## Email auth redirect URLs

Dashboard: **Authentication → URL Configuration**.

| Setting | Value |
| --- | --- |
| Site URL | `https://nfernie.github.io/Katies-Adventures-2_Chapter-2` |
| Redirect | `https://nfernie.github.io/Katies-Adventures-2_Chapter-2/lock/` |
| Local redirect | `http://localhost:3000/Katies-Adventures-2_Chapter-2/lock/` |

The app sends `emailRedirectTo` to `/lock/` on the current origin (`lockRedirectUrl()` in `src/data/auth.ts`). Onboarding generate can send the same link back to `/onboarding/`.

Send the link from **You** (`/settings`) or `/lock`. Open it in **this same browser**. No password form. `/lock/` no longer leads with a second Send button — that sits under **Send a new magic link**.

## Personal rows need a signed-in session

Every personal table uses **`owner_id = auth.uid()`** for the `authenticated` role. **`anon` is revoked.** Signed-out visitors (including incognito) cannot read those rows.

Prove it: `bash scripts/prove-supabase-anon.sh`. The signed-out empty state on Today / Plan / Log / Session / You is the product copy for that rule.

`DEFAULT_OWNER_ID` is test/fixture only. Do not add an open-anon policy.

## Auth rate limits (project defaults)

BodyPlan does **not** add a custom limiter. Use the Supabase project defaults ([Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits), dashboard **Authentication → Rate Limits**):

- Built-in email provider: **2 emails per hour** project-wide. Custom SMTP is the only way to raise that.
- Magic link / OTP (`/auth/v1/otp`): **30 OTPs per hour** project-wide (customizable); **60 seconds** between sends to the same address.
- Magic links expire in **1 hour** by default.

If send fails after a couple of tries, wait; do not hammer **Send magic link**.

## How magic-link sign-in works

1. Type an email on You or `/lock`. Paste is allowed (`autocomplete="email"`).
2. Supabase emails a one-time link.
3. Open the link on this phone. `/lock/` confirms the session.
4. Personal writes stamp `owner_id` from `auth.uid()`.

## Disclaimer

Onboarding **Generate** still shows the 18+ / not-medical disclaimer. The same line is in the footer on every non-onboarding route.

## Unlisted / noindex

- `src/app/layout.tsx` sets `robots: { index: false, follow: false }`.
- `public/robots.txt` is `Disallow: /` under the project `basePath` (`…/Katies-Adventures-2_Chapter-2/robots.txt`). Crawlers that only fetch `nfernie.github.io/robots.txt` will not see that file — hence the meta robots tag.

## Owner launch approval

- [ ] I (the owner) accept the live Pages URL and the magic-link + RLS setup above.

Until that box is ticked in this file (or equivalently: you merge and use the site), Phase 10 is **code-complete**, not owner-signed-off.

## Troubleshooting

### Generate: `Could not find the 'training_setting' column of 'day_plans'`

The live project applied `0003` (RLS repair) on an older `day_plans` table. The app writes `training_setting`; Postgres does not have that column yet. Some projects also lack `workout_sessions.setting` (an earlier 0004 failed with `column s.setting does not exist`).

1. SQL Editor → New query.
2. Paste **all** of the current `supabase/migrations/0004_day_plans_training_setting.sql` → **Run**. Safe to re-run; it adds both columns only if missing.
3. Generate again. Do not put `service_role` in the website.

### Sign-in keeps offering a fresh magic link

Open the emailed link in the **same browser** that requested it. `/lock/` is the check-email screen; send a **new** link only if the first expired (about an hour) or the click failed. After a successful click you should see **You are in**, then **Open You**.

