# Katies-Adventures-2_Chapter-2

**BodyPlan** — personal 18+ planner. Product brief: [`PRODUCT.md`](./PRODUCT.md). Design: [`DESIGN.md`](./DESIGN.md). Glossary: [`CONTEXT.md`](./CONTEXT.md). Phase plan: [`InitialPlan180826.md`](./InitialPlan180826.md) (revision 5).

## Run locally

This is a **GitHub Pages project site**. `basePath` is `/Katies-Adventures-2_Chapter-2`.

```bash
npm install
npm run dev
```

Open `http://localhost:3000/Katies-Adventures-2_Chapter-2/` then **Start onboarding** (`/onboarding`).

```bash
npm run lint
npm run typecheck
npm test
npm run assert:static
npm run build
```

`out/` is the static export. `public/.nojekyll` ships with it.

## GitHub Pages (one-time)

The first deploy failed with **404** until Pages is turned on. That is a repo setting, not a build bug.

```bash
bash scripts/wizard-github-pages.sh
```

Or click through [`docs/wizard/github-pages.md`](./docs/wizard/github-pages.md): **Settings → Pages → Source → GitHub Actions**, skip templates, then **Re-run failed jobs**. Live URL: `https://nfernie.github.io/Katies-Adventures-2_Chapter-2/`.

## Env

Copy `.env.example` to `.env.local`. Browser vars are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `USDA_FDC_API_KEY` is **tools/CI only** (Phase 6) — never `NEXT_PUBLIC_`. Never `service_role`. Put the real FDC key in gitignored `.env` (or `.env.local`), **not** in `.env.example`.

Launch checklist (Pages URL, GitHub secrets, magic-link redirects, RLS): [`docs/launch.md`](./docs/launch.md).

## Seed

There is no SQL dump of personal rows. Catalog JSON is git-owned: after a data.gov FDC key, enrich then check. Ingest grows drafts under `data/ingest/`.

```bash
npx tsx tools/nutrition/enrich.ts
npm run nutrition:check
npm run ingest:recipes
npm run ingest:exercises
```

Catalog ingest (Phase 9): first-party drafts and wger exercise JSON live under `data/ingest/`. Sources: [`docs/content-sources.md`](./docs/content-sources.md). Never import scrapegraphai or USDA from `src/`.

Walkthrough: [`docs/wizard/usda-fdc.md`](./docs/wizard/usda-fdc.md). If a key was ever committed, rotate it on data.gov and run `gh secret set USDA_FDC_API_KEY`.

If you have not created a Supabase project yet:

```bash
bash scripts/wizard-supabase-pages.sh
```

Or click through [`docs/wizard/supabase-pages.md`](./docs/wizard/supabase-pages.md): new project, Email provider, `/lock/` redirect URLs, paste `0001_init.sql` (or `0003_repair_auth_rls.sql` if tables already exist, then `0004_day_plans_training_setting.sql`), GitHub Actions variables. Prove signed-out REST with `bash scripts/prove-supabase-anon.sh`.

## Magic-link sign-in

**You** (`/settings`) and `/lock` send a Supabase Auth email link. Personal rows use `owner_id = auth.uid()`. Incognito cannot see them. No Google OAuth, no password product. Redirect URLs and rate-limit defaults: [`docs/launch.md`](./docs/launch.md).

## Disclaimer

BodyPlan is a personal planner, not medical treatment. Intended for adults 18+. The same line is on onboarding Generate and in the app footer.

## See the prototype

The throwaway HTML is still at [`docs/ux/prototype/index.html`](./docs/ux/prototype/index.html).

v1: GitHub Pages project site + `basePath` + Supabase, single user, **magic-link auth in Phase 4** (with persistence). Mixed training week (gym / home / bands / bodyweight per weekday). Recipe macros in `data/recipes.json` are USDA-checked when written, not via a live API from the site. Phase 6 catalog is **not done** until the FDC key wizard + enrich have run. §3 is frozen (revision 5 amends Q9 and Q18) — do not re-interview it.
