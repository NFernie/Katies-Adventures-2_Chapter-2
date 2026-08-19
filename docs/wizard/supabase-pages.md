# Create a Supabase project for BodyPlan (one-time)

Phase 4 code is in the repo. **Live persistence needs a project you create.** There is no `NEXT_PUBLIC_SUPABASE_URL` in this environment, so SQL is **not** applied from CI.

Walk-through script (opens the URLs and writes `.env.local` + GitHub Actions variables):

```bash
bash scripts/wizard-supabase-pages.sh
```

Never paste `service_role`, `sb_secret_…`, the database password, or `DATABASE_URL` into the website, `.env.local`, or GitHub `NEXT_PUBLIC_` variables.

Dashboard paths below match the current hosted Studio (Auth settings live under **Authentication**, not only Project Settings). Old Settings shortcuts still redirect.

## 1. Create the project

1. Open [Supabase dashboard](https://supabase.com/dashboard).
2. Sign in (GitHub is fine).
3. **New project** (organisation home, top right).
4. **Name:** `BodyPlan` (or similar).
5. **Database password:** Generate and store in your password manager. Not used by GitHub Pages.
6. **Region:** closest to you.
7. **Create new project.** Wait until the project is **Active**.

## 2. Copy Project URL + anon / publishable key

1. Project home → top bar **Connect** ([deep link](https://supabase.com/dashboard/project/_?showConnect=true)).
2. Copy **Project URL** (`https://<project-ref>.supabase.co`).
3. Left sidebar **Settings** (gear) → **API Keys** ([deep link](https://supabase.com/dashboard/project/_/settings/api-keys)).
4. Copy **Publishable key** (`sb_publishable_…`) **or** Legacy API Keys → **`anon` `public`**.
5. **Do not** copy **Secret keys** or **`service_role`**.

Paste into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon or publishable>
```

## 3. Email magic link (no Google, no password product)

1. Left sidebar **Authentication** → **Sign In / Providers** ([deep link](https://supabase.com/dashboard/project/_/auth/providers)).
2. Open **Email**.
3. **Enable Email provider:** ON (often already on for new projects).
4. Leave **Confirm email** ON. Clicking the magic link is the confirmation.
5. Do **not** enable Google, Apple, GitHub, Phone, or Anonymous.
6. You are not adding a password form. BodyPlan v1 is email magic link only.

## 4. Redirect URLs

1. **Authentication** → **URL Configuration** ([deep link](https://supabase.com/dashboard/project/_/auth/url-configuration)).
2. **Site URL:** `https://nfernie.github.io/Katies-Adventures-2_Chapter-2`  
   Do not leave this as `http://localhost:3000`.
3. **Redirect URLs** → Add each, then **Save**:
   - `https://nfernie.github.io/Katies-Adventures-2_Chapter-2/lock/`
   - `http://localhost:3000/Katies-Adventures-2_Chapter-2/lock/`
4. Optional globs if a link 400s on a trailing-slash mismatch: `https://nfernie.github.io/Katies-Adventures-2_Chapter-2/**` and `http://localhost:3000/**`.

The app sends `emailRedirectTo` to `/lock/` on the current origin (`src/data/auth.ts`).

## 5. Apply SQL (auth-scoped RLS from the first apply)

1. Left sidebar **SQL Editor** → **New query** ([deep link](https://supabase.com/dashboard/project/_/sql/new)).
2. Paste all of `supabase/migrations/0001_init.sql` → **Run**.
3. **New query** → paste `supabase/migrations/0002_owner_auth_fk.sql` → **Run**.
4. **Table Editor** → `profiles` / `training_days`: **RLS ON**. Policies named `*_auth_owner` use `owner_id = auth.uid()` for **`authenticated`**. **`anon` is revoked.** There is no `is_v1_owner` policy. Do not add one.

## 6. GitHub Actions variables (Pages build)

`NEXT_PUBLIC_` values are compiled into the static export.

1. Repo **Settings → Secrets and variables → Actions → Variables**.
2. `NEXT_PUBLIC_SUPABASE_URL`
3. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Re-run the **pages** workflow so production gets the keys.

Do not add `service_role` here.

## 7. Prove it

1. Local: `npm run dev` → `http://localhost:3000/Katies-Adventures-2_Chapter-2/settings/` → **Send magic link**.
2. Open the email on the same device. `/lock/` should say you are in.
3. On **You**, save height/weight + at least one train day. Hard-refresh. Numbers stay.
4. **Incognito** (or signed out): Today/You show the empty state. Personal rows are not readable.

Until this wizard is finished, the app still static-exports; the magic-link form explains that Supabase is not configured.
