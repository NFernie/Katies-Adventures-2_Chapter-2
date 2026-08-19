# Change log

Dated record of BodyPlan work in this repo. Newest first. Katie’s Adventures is the **repo name** only; the product is BodyPlan.

---

## 19 Aug 2026 — Phase 4 prove-it: project exists, SQL not yet auth-scoped

Owner wired a live project (`gbpwayarlvdvrotjnufa`) and Email OTP. Step 7 is **not** complete.

- Live `profiles` still has `gym_days_per_week` NOT NULL. `training_days` is missing (`PGRST205`). Signed-out POST reaches the table (constraint errors, not permission denied).
- Added `supabase/migrations/0003_repair_auth_rls.sql` (drop `gym_days_per_week`, create `training_days`, revoke anon, `*_auth_owner`). Use this instead of `0001_init.sql` when tables already exist.
- `scripts/prove-supabase-anon.sh` + wizard step 5/7 notes. Do not tick the Phase 4 live gates until that script is green and a magic-link session round-trips.
- Stripped a real `USDA_FDC_API_KEY` from `.env.example` (rotate that data.gov key). Publishable Supabase key may stay public; never commit USDA.

---

## 19 Aug 2026 — Phase 4 data gateway + magic-link auth (code; live apply blocked)

Persistence and email magic-link land together. No open `DEFAULT_OWNER_ID` policy. No NextAuth. No Prisma runtime.

- `src/data`: `@supabase/supabase-js` only here. `createBrowserClient()` persists the session JWT. `getOwnerId()` returns `session.user.id` or throws. `DEFAULT_OWNER_ID` is fixture-only.
- `profiles` + `training_days` writes always stamp `owner_id` from the session. Gateway tests: unscoped queries are impossible; signed-out/incognito cannot read personal rows.
- Settings (**You**) and `/lock` send a magic link (`signInWithOtp`). Signed-out empty state on Today and You. No Google OAuth, no password form.
- RLS SQL unchanged in intent: `authenticated` + `owner_id = auth.uid()`, `anon` revoked, no `is_v1_owner`. Optional `0002_owner_auth_fk.sql` → `auth.users(id)`.
- **Did not apply SQL or generate types from a live project** — no owner credentials. Wizard: `docs/wizard/supabase-pages.md` + `scripts/wizard-supabase-pages.sh` (project, Email provider, redirect URLs, paste SQL, GitHub `NEXT_PUBLIC_` variables).
- Pages workflow can bake `vars.NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` at build time.

Until the wizard is finished, the static site still exports; the form explains that Supabase is not configured.

---

## 19 Aug 2026 — Revision 5: mixed training week + auth at persistence

Owner reopened Q9 and auth after Phase 3. Specs and UX updated; Phase 3 scaffold was **not** rebuilt. Energy fixture kcal/macros are **unchanged**.

- `InitialPlan180826.md` revision 5. Q9 = mixed week (gym / home / bands / bodyweight per weekday). Q18 = magic link **in Phase 4**. Phase 4 and old 4b are **one** phase. Phases 5, 7, 8, 10 prompts retargeted.
- Phase 1: `DESIGN.md`, flows, inventory, critique, prototype weekday picker + week strip + You magic-link / `#lock`. Screenshots **not** regenerated (HTML is source of truth).
- Phase 2: `training_days` table; drop `gym_days_per_week`; engine `trainingWeek`; exercise `tracks`; RLS `auth.uid()` (revoke anon). ADRs `0003`, `0004` (0002 superseded).
- Male 4-day week map: Mon gym, Tue rest, Wed bands, Thu rest, Fri gym, Sat home, Sun rest (still 2270 kcal). Female 6-day: Mon gym … Sat bands, Sun rest (still 1930 kcal).
- `DEFAULT_OWNER_ID` is test/fixture only. Shell copy on Settings / Plan updated.

Do not apply SQL without credentials. Do not reopen NextAuth, OAuth, imperial, or photos.

---

## 19 Aug 2026 — GitHub Pages 404 on first deploy

The Phase 3 **build** was green. `actions/deploy-pages` 404’d because the repo had Pages off (`has_pages: false`). Not a Next.js export bug.

- `docs/wizard/github-pages.md` + `scripts/wizard-github-pages.sh` — Settings → Pages → Source → **GitHub Actions**, skip templates, re-run the failed job.
- Deploy job now fails with that URL if Pages is still off, then runs `configure-pages`.

Live URL after the owner click: `https://nfernie.github.io/Katies-Adventures-2_Chapter-2/`.

---

## 19 Aug 2026 — Phase 3 Next.js static scaffold

GitHub Pages **project** site app in the repo root.

- Next.js 16 App Router + TypeScript + Tailwind v4. `output: 'export'`, `trailingSlash: true`, `images.unoptimized`, `basePath: /Katies-Adventures-2_Chapter-2`.
- shadcn (`components.json`) + `@aceternity` registry. One Aceternity piece: Plan bento, restyled to DESIGN.md (no dark OLED cards).
- DESIGN.md tokens in `src/app/globals.css`. Fonts: Archivo + Archivo Narrow via `next/font`.
- Placeholder routes: `/` (Today shell), `/onboarding`, `/plan`, `/settings`. `/log` exists so the four-tab nav is honest. **No `/login`.**
- `src/data/owner.ts` (`DEFAULT_OWNER_ID`). `src/data/client.ts` throws until Phase 4.
- `.env.example`: public Supabase URL + anon key; `USDA_FDC_API_KEY` tools/CI only (not `NEXT_PUBLIC_`). No `service_role`.
- `.github/workflows/pages.yml` — lint, typecheck, test, static build, upload `out/` to Pages. `public/.nojekyll`.
- Gate: lint, typecheck, `npm test`, `npm run build` (static), impeccable detect **0** on the home shell (`docs/ux/audit-home-shell.md`, 18/20).
- After merge: set the repo’s Pages source to **GitHub Actions** so the public URL loads.

No Prisma, NextAuth, or Server Actions.

---

## 19 Aug 2026 — Phase 2 domain spec + Phase 1 contrast caveat

**Phase 1 caveat (do first):** Helper copy that used **iron-2** `#2c2c2c` (including “InBody / Tanita (BodyID). Type the printout. No photos.”) was washed out on platform `#d4d0c6`. Token is now **`#1a1a1a`**. `DESIGN.md` documents iron-2, plus the already-shipped `1.15rem` input-live / Continue band steps. Prototype CSS updated. **Screenshots were not regenerated.**

**Phase 2 (docs/SQL only, no React, not applied):**

- `docs/domain/erd.md` — `owner_id` on every personal table; `unique(owner_id)` on `profiles`; catalog has no `owner_id`.
- `docs/domain/engine-spec.md` — locked formulae; male + female worked examples (user-selected gym days, InBody fat % present). Unsafe speed is the only generator block.
- `docs/domain/content-model.md` — closed diet/kitchen tags; recipe JSON with `ingredients.grams`, `fdcId`, `nutrition.source: usda-fdc`.
- `docs/domain/fixtures/engine-examples.json` — known-good literals for Phase 5.
- `supabase/migrations/0001_init.sql` + `supabase/policies.sql` — v1 RLS vs Phase 4b RLS comments. **Do not apply without credentials.**
- `CONTEXT.md` — PAL, energy target, calorie-floor warning, deload, diet/kitchen flags, split; `DEFAULT_OWNER_ID` = `198e5a49-c748-4bcc-b6ad-86445a76eb7b`.
- Optional BodyID columns named on the ERD (`body_fat_mass_kg`, `visceral_fat_level` + scale, `total_body_water_kg`); engine ignores them.

`InitialPlan180826.md`: Phase 1 marked complete; Phase 2 spec complete. Independent second-agent recompute **matched** the male, female, and unsafe-date literals.

Honour §3: metric; gym only; four goal types; no photos; no NextAuth tables.

---

## 18 Aug 2026 — Aceternity (question only, no code)

Aceternity is **seasoning** (4–6 pieces), installed later with `npx shadcn@latest add @aceternity/...` after the Phase 3 Next.js scaffold. It must not overwrite BodyPlan `DESIGN.md`. No files changed for this answer.

---

## 18 Aug 2026 — Phase 1 UX research and design system

PR #4. Bumper-plate load (Impeccable seed `c3180cb2`, assigned index 6).

- `DESIGN.md` — platform grey, iron type, wayfinding yellow, live cyan; no login chrome.
- `docs/ux/flows.md`, `docs/ux/component-inventory.md`, `docs/ux/critique-notes.md`.
- Clickable prototype: `docs/ux/prototype/index.html` (onboarding, today, swap, session, timeline) + README + PNG stills at 390px.
- `PRODUCT.md` stack note: Phase 1 ships a throwaway HTML prototype, not the production app.

Frozen §3 honoured in the prototype: metric, M/F, gym-only, user-select diet/kitchen/days/goal/timeline, no photos, disclaimer, unsafe-speed intercept, lock as copy on You. No Supabase.

---

## 18 Aug 2026 — Phase 0 product brief and glossary

PR #3. Docs-only. Did not reopen NextAuth, Netlify, imperial units, or home-gym tracks.

- `PRODUCT.md` — BodyPlan brief; §3 restated; §3 wins on conflict.
- `CONTEXT.md` — glossary (Owner, BodyID, Goal type, Unsafe loss speed, Catalog, owner_id, DEFAULT_OWNER_ID, data gateway).
- `docs/decisions/0001-v1-scope.md` — GitHub Pages **project** site + `basePath` + static export.
- `docs/decisions/0002-auth-ready-static.md` — no login wall in v1; later lock is magic link + remap `DEFAULT_OWNER_ID` → `auth.uid()`.
- `docs/domain/inbody-fields.md` — required BodyID fields; no photos.
- `docs/domain/recipe-nutrition.md` — USDA write-time contract (no live USDA in the app).

---

## 18 Aug 2026 — Revision 4 freeze: USDA write-time macros

PR #2 / plan revision 4. Recipe kcal/protein/carbs/fat must be computed from USDA FoodData Central when `data/recipes.json` is written or CI runs. The GitHub Pages app only reads committed JSON. No live USDA from the browser. `InitialPlan180826.md` §4.2.

---

## 18 Aug 2026 — §3 frozen (BodyPlan v1 decisions)

Owner answers locked: BodyPlan name, 18+, male/female, metric, InBody/Tanita, four goal types, user-select diet/kitchen/gym days, generator-chosen cardio, unsafe speed as the only generator block, no photos, GitHub Pages project site, later magic-link lock. Implementation agents must not re-ask or contradict.
