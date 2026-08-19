# Katies-Adventures-2_Chapter-2

**BodyPlan** — personal 18+ planner. Product brief: [`PRODUCT.md`](./PRODUCT.md). Design: [`DESIGN.md`](./DESIGN.md). Glossary: [`CONTEXT.md`](./CONTEXT.md). Phase plan: [`InitialPlan180826.md`](./InitialPlan180826.md) (revision 5).

## Run locally

This is a **GitHub Pages project site**. `basePath` is `/Katies-Adventures-2_Chapter-2`.

```bash
npm install
npm run dev
```

Open `http://localhost:3000/Katies-Adventures-2_Chapter-2/` (the root `/` is empty on purpose).

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

Copy `.env.example` to `.env.local`. Browser vars are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `USDA_FDC_API_KEY` is **tools/CI only** (Phase 6) — never `NEXT_PUBLIC_`. Never `service_role`.

If you have not created a Supabase project yet:

```bash
bash scripts/wizard-supabase-pages.sh
```

Or click through [`docs/wizard/supabase-pages.md`](./docs/wizard/supabase-pages.md): new project, Email provider, `/lock/` redirect URLs, paste `0001_init.sql`, GitHub Actions variables.

## Magic-link sign-in

**You** (`/settings`) and `/lock` send a Supabase Auth email link. Personal rows use `owner_id = auth.uid()`. Incognito cannot see them. No Google OAuth, no password product.

## See the prototype

The throwaway HTML is still at [`docs/ux/prototype/index.html`](./docs/ux/prototype/index.html).

v1: GitHub Pages project site + `basePath` + Supabase, single user, **magic-link auth in Phase 4** (with persistence). Mixed training week (gym / home / bands / bodyweight per weekday). Recipe macros in `data/recipes.json` are USDA-checked when written, not via a live API from the site. §3 is frozen (revision 5 amends Q9 and Q18) — do not re-interview it.
