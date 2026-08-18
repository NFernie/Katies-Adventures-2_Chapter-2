# Initial Plan — Body composition diet & exercise planner

**Document:** `InitialPlan180826.md`  
**Date:** 18 August 2026  
**Revision:** 2 — single-user GitHub Pages + Supabase; auth deferred but designed in  
**Status:** Planning (no application code yet)  
**Working title:** BodyPlan *(replace after the product-name question is answered)*  
**Audience:** Implementation agents and the product owner  
**Stack (v1):** Next.js (static export) · TypeScript · React · Tailwind CSS · Aceternity UI · Supabase JS client · Supabase Postgres  
**Deferred:** NextAuth.js, Prisma-at-runtime, multi-user login  
**Host (v1):** GitHub Pages (`*.github.io`) talking **directly** to Supabase from the browser

This document is the source of truth until a later plan supersedes it. Every implementation phase must **design → develop → review**, then stop at the listed gate. Do not start a later phase until its gate is green, or until the owner explicitly waives a question in writing.

**Revision 2 change of course:** Auth is a **low-priority, later-stage** feature. v1 is a **single-user personal tool**. The architecture must still be **auth-ready** so a login wall can be added after the owner has used the app, without rewriting the engine, UI, or schema.

---

## 1. Direct answer: can GitHub Pages host this with a Supabase backend?

**Yes.** GitHub Pages serves the website. Supabase holds the data. They do not need to live on the same computer.

| Piece | Where it runs | What it does |
| --- | --- | --- |
| Next.js `output: 'export'` | Built on GitHub Actions, files on GitHub Pages | Screens, calculator, meal/workout UI |
| `@supabase/supabase-js` | In the visitor’s browser | Reads and writes Postgres over HTTPS |
| Supabase Postgres | Supabase cloud | Profile, plans, check-ins, optional catalog |

GitHub Pages **cannot** run a Node server. That is why this revision **drops NextAuth.js and Prisma-from-the-app** for v1. Those need a server. The browser **can** call Supabase, because Supabase is already a hosted API.

What still works on this path:

- Custom body-comp inputs, generated meal and training plans, timelines  
- Saving and reopening plans (they live in Supabase, not in the HTML file)  
- Updating recipes/workouts (git JSON and/or Supabase rows)  
- A later login wall (**Supabase Auth**, not NextAuth), because Auth.js on Pages has no API routes to land OAuth callbacks on a first-party server — Supabase Auth is built for static sites

What does **not** work on GitHub Pages:

- NextAuth.js / Auth.js with a Prisma adapter  
- Prisma Client inside the website (Prisma is Node-only; it may be used **on a laptop** to push schema if you insist, but the running app must use `supabase-js`)  
- Hiding secrets in the JavaScript bundle — the **anon key is public by design**

### 1.1 Is a database required for a single user?

**Yes, if you want the plan to survive a new phone, a cleared cache, or a new deploy.** `localStorage` is a fine cache, not the source of truth.

For one person, Supabase is still the right store: one project, one set of tables, almost no operational cost on the free tier. You are not paying for “multi-user SaaS.” You are paying for **memory that is not stuck in one browser**.

### 1.2 Honest security note (single user, no login)

The GitHub Pages URL plus the public anon key is enough for **anyone who finds the site** to read and write the same tables, unless Row Level Security (RLS) is locked to a signed-in user.

That is acceptable for v1 **only because** this is a personal tool, not a public product. Body-comp data is still sensitive. The plan therefore:

1. Ships **without** a login wall (owner request).  
2. Puts `owner_id` on every personal row from day one.  
3. Keeps **all** database calls behind one module.  
4. Treats **Supabase Auth + RLS** as a **bolt-on phase after the owner has tested the app**, not as a rewrite.

Do **not** put the `service_role` key in the website. Ever.

---

## 2. Target architecture (auth-ready single user)

```
Phone / laptop browser
        │
        ▼
GitHub Pages  (static Next.js export)
        │  @supabase/supabase-js  (anon key only)
        ▼
Supabase Postgres
        │
        ├── recipes / exercises   (optional: also shipped as JSON in the repo)
        └── profile, goals, plans, check-ins   (always in Supabase)
```

**Later (optional Phase 4b / Phase 11):** same diagram, plus `supabase.auth` session. RLS changes from “anon may touch the single owner row” to `owner_id = auth.uid()`. UI gains a login screen. Engine and meal cards stay as they are.

### 2.1 Why not NextAuth + Prisma on this host

| Original idea | v1 decision | Why |
| --- | --- | --- |
| NextAuth.js | **Out of v1. If auth is added, use Supabase Auth.** | NextAuth wants server callbacks. Supabase Auth works from static JS. |
| Prisma in the web app | **Out of the running app.** Optional laptop-only migrations. | Prisma does not run in the browser. |
| Netlify/Vercel | **Not required for v1.** Keep as an escape hatch if you later want server features. | Pages + Supabase is enough for a personal planner. |
| One Profile row with no owner | **Forbidden.** Use `owner_id` even for one person. | Otherwise adding auth means a schema rewrite. |

### 2.2 Auth-ready rules (non-negotiable from Phase 4 onward)

These exist so login can be added after single-user testing **without** rebuilding the product.

1. **Single data gateway.** Only `src/data/*` may import `supabase-js`. Pages, components, and the engine never call `.from()` themselves.  
2. **`owner_id uuid not null`** on every personal table: `profiles`, `goals`, `plans`, `plan_versions`, `day_plans`, `meal_slots`, `workout_sessions`, `workout_items`, `check_ins`, `favorites`.  
3. **v1 owner constant.** `src/data/owner.ts` exports `DEFAULT_OWNER_ID` (a real UUID you generate once and commit). Every insert/select in v1 filters to that id. When auth lands, this file becomes “current user id from session” and the constant is deleted.  
4. **One profile per owner.** `unique (owner_id)` on `profiles` — not a table that can only ever have one row in the whole database.  
5. **RLS on from the first migration.** v1 policy: `true` for `anon` **and** `authenticated`, but only for rows where `owner_id = DEFAULT_OWNER_ID` (the UUID baked into the policy or checked in the client *and* in SQL). Document the policy in `supabase/policies.sql`. Phase 4b replaces it with `owner_id = auth.uid()`.  
6. **No `auth.users` foreign key in v1.** `owner_id` is a UUID column, not `references auth.users`. Phase 4b may add that FK after the first real user id exists.  
7. **Catalog vs personal data.** Recipes and exercises are **not** personal. Prefer **static JSON in the repo** (`data/recipes.json`, `data/exercises.json`) so the library is versioned in git and does not need write access from the anon key. User swaps and pins are personal rows in Supabase.  
8. **Engine is pure.** `src/engine` has no Supabase, no owner id, no React. Auth cannot infect the maths.  
9. **Session-shaped client now.** `createBrowserClient()` is a function, not a pile of globals, so Phase 4b can attach `Authorization: Bearer <jwt>` without touching screens.  
10. **Do not encode “logged in” into routes.** No `/login` required in v1. Settings can later grow a “Sign in to lock this data” card. Keep `/plan` working whether a session exists or not, as long as `getOwnerId()` returns a UUID.

### 2.3 How auth will be added later (so v1 does not paint us into a corner)

When the owner is happy with the planner:

1. Enable Email (magic link) in the Supabase project — one account.  
2. Add a small `/lock` or Settings sign-in using `@supabase/auth-ui-react` or a custom form.  
3. On first successful login, **map** `DEFAULT_OWNER_ID` rows to `auth.uid()` with a one-off SQL update (or keep the UUID and set that user’s id to the same UUID via `auth.users` id override — prefer the SQL remap; document it).  
4. Tighten RLS to `owner_id = auth.uid()`. Revoke the open anon policy.  
5. `getOwnerId()` reads `session.user.id` and throws if missing.  
6. No NextAuth, no Prisma adapter, no Netlify requirement unless you also want other server features.

**Further planning (only if this happens):** if a second person needs their own plan, the same RLS already supports it — onboard creates a new `profiles` row for the new `owner_id`. Do not build that UI in v1.

---

## 3. Open questions (answer before Phase 2 coding)

Implementation agents must **not invent answers**. If a question is unanswered, stop and write the assumed default in a PR comment, then wait.

**Already decided in this revision**

- Audience: **single user**, not a public product.  
- Host: **GitHub Pages + Supabase**.  
- Auth: **deferred**. Design auth-ready; do not implement a login wall in v1.  
- When auth is added: **Supabase Auth**, not NextAuth.

### Product and people

1. **Product name and voice?** Working title is BodyPlan. Personal tool vs “Katie’s Adventures” chapter branding?  
2. **Adults only?** Recommended 18+.  
3. **Sex / gender model?** Male or female for Mifflin–St Jeor. Prefer-not-to-say in v1? (Default: binary for the formula.)  
4. **Units?** Toggle; store metric internally. Confirm.  
5. **Body composition source?** DEXA, InBody/Tanita, calipers, Navy tape, or weight-only?  
6. **Primary goal mix?** Fat loss, fat loss + retain muscle, recomp, maintain?

### Nutrition and training

7. **Dietary constraints?** Vegetarian, vegan, allergies, cooking time, servings?  
8. **Kitchen reality?** Batch-cook, leftovers as lunch, eating-out days?  
9. **Training setting?** Gym, home dumbbells, bands, bodyweight? Days per week?  
10. **Cardio?** Walking, Zone 2, intervals, none beyond steps?  
11. **Timeline rules?** Engine proposes a range and blocks unsafe speed (recommended)?  
12. **Recipe source for v1?** Default: **owned JSON in the repo**, not scraping.  
13. **Exercise source for v1?** Same.

### Legal, content, later auth

14. **Medical disclaimer** — who signs off? Hard-stops (pregnancy, eating-disorder history, BMI floor, under 18)?  
15. **May the single user swap meals and lifts**, or is the generated week locked? (Default: swaps allowed.)  
16. **Progress data** — weight, tape, mood? Default v1: **no photos**.  
17. **GitHub Pages type** — user site (`username.github.io`) or project site (`username.github.io/Katies-Adventures-2_Chapter-2`)? Project sites need `basePath`.  
18. **After testing, do you want the optional lock?** If yes, email magic link is enough (one inbox). Do not design Google OAuth until that phase.  
19. **Who may the later login protect against?** Random visitors to a public repo’s Pages site is the realistic threat. A determined person with the old anon policy in an old JS bundle is a further-planning item (cache + policy version).

### Suggested defaults if the owner says “use defaults”

- Adults 18+, binary sex for BMR, unit toggle, fat-loss + muscle retain.  
- Optional body-fat %; else waist (Navy) or conservative weight-only deficit.  
- Omnivore catalog with vegetarian filter. Gym + home dumbbell tracks.  
- Engine proposes timeline; user may slow it, not exceed the safety cap.  
- Owned JSON catalog. Swaps allowed. No photos.  
- GitHub Pages project site + `basePath`. Supabase for personal data. Auth later via magic link.

---

## 4. How to access and update recipes and exercise plans

### 4.1 v1: git-owned catalog + Supabase personal plans

**Catalog (read-mostly):** `data/recipes.json` and `data/exercises.json` shipped with the static site. Update by PR. No anon write access, so a stranger cannot poison the food library.

**Personal plan (read/write):** generated week, pins, swaps, completions, check-ins in Supabase, always scoped by `owner_id`.

**Minimum catalog size**

- ~40 breakfasts, ~40 lunches, ~40 dinners, ~25 snacks (vegetarian coverage).  
- ~50–80 exercises: squat, hinge, push, pull, lunge, carry, core, Zone 2.

**How the user *accesses* a plan**

| Surface | Behaviour |
| --- | --- |
| Today | Four meal cards + today’s workout, large checkboxes |
| This week | 7-day strip; tap a day |
| Plan | Goal, timeline, calories, macros, split, “why this plan” |
| Library | Search catalog; favourite; “use this instead” |
| History | Past weeks frozen |

**How the user *updates* a plan**

| Action | Rule |
| --- | --- |
| Swap a meal | 3 alternatives, same slot, ±10% kcal, ±20% protein |
| Shuffle a day | Re-roll unpinned slots |
| Pin a recipe | Regeneration must not replace it |
| Log “I ate something else” | Optional note; does not rewrite the forward plan unless they regenerate |
| Swap an exercise | Same movement pattern + equipment |
| Skip / deload | Record skip; 2+ skips in a week → deload prompt |
| Profile / goal change | New `plan_versions` row; old week stays readable |
| Catalog update (git) | New recipes appear in **future** swaps only |

### 4.2 Licensed APIs (Phase 9, optional)

Ingest on a **laptop**, write JSON or upsert catalog tables. Never call paid APIs from the Pages bundle on every view.

- USDA FoodData Central, Spoonacular/Edamam, wger.de  

### 4.3 ScrapeGraphAI (Phase 9, gated)

Local ingest only. Follow `.agents/skills/scrapegraph-content-ingest/SKILL.md`. No commercial recipe-site scraping. Output JSON → PR → merge into `data/`.

### 4.4 Owner update loop

**v1:** edit JSON, open a PR, GitHub Actions redeploys Pages.  
**v1.5:** optional Supabase catalog tables + a crude edit form **behind the later auth lock** (do not ship a public write UI while anon can write).  
**v2:** out of scope.

---

## 5. Product surfaces and domain

### 5.1 App surfaces (mobile web)

| Route | Purpose |
| --- | --- |
| `/` | Today if a plan exists, else start onboarding. Not a marketing SaaS landing. |
| `/onboarding` | Sex, age, height, weight, body comp, goal, timeline, diet, equipment |
| `/plan` | Current plan home (today + week) |
| `/plan/meals` | Meal calendar + swap |
| `/plan/workouts` | Training calendar + swap |
| `/plan/timeline` | Goal date, projected vs actual, check-ins |
| `/log` | Weigh-in and adherence |
| `/recipes/[slug]` | Recipe detail |
| `/exercises/[slug]` | Exercise detail |
| `/settings` | Profile, units, regenerate; **later:** “Lock with email” |
| `/lock` | **Not in v1.** Phase 4b only. |

Bottom nav: Today · Plan · Log · You. Impeccable **product** lane. Aceternity is seasoning (bento, motion on one or two surfaces), not every card.

### 5.2 Domain model (auth-ready)

Working vocabulary for `CONTEXT.md`. Tables, not Prisma models, unless someone uses Prisma **only** on a laptop to emit SQL.

- `profiles` — `owner_id unique`, `sex`, `birth_date`, `height_cm`, `weight_kg`, optional `body_fat_pct`, `waist_cm`, `hip_cm`, `activity_level`, `diet_flags`, `equipment`, `injuries_note`  
- `goals` — `owner_id`, `type` (`fat_loss` \| `recomp` \| `maintain`), targets, `start_on`, `end_on`, `weekly_loss_cap_pct`  
- `plans` / `plan_versions` — calorie target, macros, split, generator input snapshot  
- `day_plans`, `meal_slots`, `workout_sessions`, `workout_items`  
- `check_ins`  
- `favorites`  
- Catalog files (or tables without `owner_id`): `Recipe`, `Exercise`

v1 inserts always set `owner_id = DEFAULT_OWNER_ID`. Do not add NextAuth `Account` / `Session` tables.

### 5.3 Planning engine (unit-test in Phase 5)

Pure TypeScript `src/engine/` — no React, no Supabase.

1. **BMR** — Mifflin–St Jeor: male `10w + 6.25h − 5a + 5`, female `10w + 6.25h − 5a − 161` (kg, cm, years).  
2. **TDEE** — BMR × activity (sedentary 1.2 … extra 1.725). Conservative if unsure.  
3. **Rate** — default 0.5% body weight / week; cap 1.0%. Not below BMR; not below **1200 kcal** (female) / **1500 kcal** (male) without a further-planning dietitian flag.  
4. **Timeline** — `weeks = max(8, ceil(gapKg / weeklyKg))`. Faster dates are refused.  
5. **Macros** — protein 1.6–2.2 g/kg (Phase 2 decides actual vs goal weight); fat ≥ 0.7 g/kg; carbs fill the rest.  
6. **Meals** — knapsack over slot-tagged recipes, diet flags, leftover rule.  
7. **Training** — default 3 resistance + 2 Zone 2; split from days available; deload every 4th week. Same movement menu for male and female.

**Hard-stops:** age < 18, BMI < 18.5, faster than cap, medical notes if collected. Wellness maths, not clinical care. Disclaimer on generate.

### 5.4 UI kit

- Tailwind tokens from `DESIGN.md`  
- Aceternity via `npx shadcn@latest add @aceternity/...` (few components)  
- shadcn primitives for forms/sheets  
- Lucide/Phosphor SVGs, no emoji-as-icon  
- 44×44 targets, `prefers-reduced-motion`  
- `images: { unoptimized: true }` because Pages has no `/_next/image`

### 5.5 Skills in this repo

| Skill | Path | Use for |
| --- | --- | --- |
| Refero Design | `.agents/skills/refero-design` | Research-first UI |
| Impeccable | `.cursor/skills/impeccable` | `init`, `shape`, `craft`, `audit`, `critique`, `polish` |
| UI/UX Pro Max | `.agents/skills/ui-ux-pro-max` | Style/palette/UX checklist |
| Matt Pocock set | `.agents/skills/*` | `tdd`, `implement`, `code-review`, `domain-modeling` |
| ScrapeGraph ingest | `.agents/skills/scrapegraph-content-ingest` | Legal catalog ingest only |

First design session: `/impeccable init` (product lane). Tickets in `docs/tickets.md` unless the owner wants GitHub issues.

---

## 6. How every phase is gated

1. **Design** — research or spec; no unplanned coding.  
2. **Develop** — smallest slice; TDD for engine/data.  
3. **Review** — tests and/or a named further-planning stop.  
4. **Gate** — binary. Red means stop.

---

## Phase 0 — Align and freeze the brief

**Goal:** Freeze v1 as a single-user Pages + Supabase app, with auth-ready rules accepted.

### Design

- Grill remaining §3 questions (`grill-with-docs`).  
- `PRODUCT.md`: personal tool, anti-goals (no public social, no App Store).  
- `CONTEXT.md` glossary including `owner_id`, `DEFAULT_OWNER_ID`, Data gateway.  
- ADR: hosting + deferred auth.

### Develop

- Docs only: `docs/decisions/0001-v1-scope.md`, `docs/decisions/0002-auth-ready-static.md`.

### Review

- Owner agrees Pages + Supabase, no login in v1, later lock uses Supabase Auth.  
- No medical-guarantee copy.

### Gate

- [ ] Remaining §3 questions answered or defaults accepted  
- [ ] Auth-ready rules in §2.2 accepted  
- [ ] `PRODUCT.md` exists  

**Further planning if:** public multi-user product, under-18, or clinical dietetics.

### Implementation-agent prompt

```text
You are the Phase 0 planning agent. Read InitialPlan180826.md (revision 2)
end to end. Load grill-with-docs, domain-modeling, writing-for-agents.

Do not write application code. Do not scaffold Next.js.

v1 is already decided: GitHub Pages + Supabase JS, single user, no login
wall, auth-ready owner_id + data gateway. Do not reopen NextAuth or
Netlify unless the owner explicitly reverses revision 2.

Tasks:
1. Interview remaining §3 questions. If you cannot reach the owner, write
   docs/questionnaires/phase-0.md and stop.
2. Write PRODUCT.md, CONTEXT.md (glossary), docs/decisions/0001-v1-scope.md,
   docs/decisions/0002-auth-ready-static.md (how Phase 4b will remap
   DEFAULT_OWNER_ID → auth.uid()).
3. Stop at the Phase 0 gate. Docs-only PR.

Review: no silent multi-user or NextAuth scope.
```

---

## Phase 1 — UX research and design system

**Goal:** Distinctive mobile product UI for **one person using their own planner**, not a SaaS sign-up funnel.

### Design

- Refero: habit home, meal cards, workout player (Strong, Hevy, Lifesum — synthesise).  
- UI/UX Pro Max: habit + recipe + fitness; one style, one palette, one type pair.  
- Impeccable: `init` then `shape` for onboarding, today, swap sheet, session, timeline.  
- 4–6 Aceternity pieces max. **No login screen in v1.** Leave a quiet Settings slot for a later lock.  
- First plan in under 3 minutes (no account creation step).

### Develop

- `DESIGN.md`, `docs/ux/flows.md`, `docs/ux/component-inventory.md`.  
- Optional HTML prototype of onboarding + today + swap.

### Review

- `/impeccable critique`. Contrast 4.5:1, 44px targets. 375 / 390 / 430 widths.

### Gate

- [ ] `DESIGN.md` + `PRODUCT.md`  
- [ ] Reference lock listed  
- [ ] Five core screens prototyped  
- [ ] Owner thumbs-up or written proceed  

**Further planning if:** native iOS/Android.

### Implementation-agent prompt

```text
You are the Phase 1 design agent. Read InitialPlan180826.md revision 2,
PRODUCT.md, Phase 0 ADRs. Load refero-design, ui-ux-pro-max, impeccable,
prototype.

Research before pixels. Product lane. Mobile-first. No login / marketing
hero as the product. Aceternity is seasoning.

Deliver DESIGN.md, docs/ux/flows.md, component inventory, clickable
prototype (onboarding, today, swap). Critique notes.

Do not add a sign-up flow. Settings may show a disabled “Lock this data
later” note in copy only if it does not look like a broken button.

Gate: owner review of DESIGN.md. No Supabase yet.
```

---

## Phase 2 — Domain model and engine spec

**Goal:** Testable maths + auth-ready ERD.

### Design

- ERD with `owner_id` on every personal table.  
- Missing body-fat, protein rule, calorie floors, leftovers.  
- Engine I/O types. Engine does not mention owner.

### Develop

- `docs/domain/erd.md`, `docs/domain/engine-spec.md` (male + female worked examples), `docs/domain/content-model.md`.  
- Draft `supabase/migrations/0001_init.sql` (proposal; apply in Phase 4).  
- Draft `src/data/owner.ts` contract in the spec (constant UUID).

### Review

- Independent recalculation of fixtures.  
- Confirm no singleton table without `owner_id`.

### Gate

- [ ] Worked examples match  
- [ ] ERD has owner_id everywhere personal  
- [ ] Owner agrees floors and loss cap  

### Implementation-agent prompt

```text
You are the Phase 2 domain agent. Read InitialPlan180826.md §2.2 and §5.
Load domain-modeling, to-spec, tdd (spec/fixtures only).

Deliver:
1. docs/domain/erd.md — owner_id on personal tables; unique(owner_id) on
   profiles; catalog without owner_id
2. docs/domain/engine-spec.md with two worked examples
3. docs/domain/content-model.md
4. Proposed supabase/migrations/0001_init.sql plus comments for v1 RLS
   vs Phase 4b RLS (do not apply without credentials)
5. CONTEXT.md updates

No React. No NextAuth tables. Gate if any formula is underspecified.
A second agent must recompute the worked examples.
```

---

## Phase 3 — Next.js static scaffold for GitHub Pages

**Goal:** Typed Next.js app that **static-exports** and deploys to GitHub Pages.

### Design

- App Router, `src/`, fonts from `DESIGN.md`.  
- `components.json` with `@aceternity`.  
- `next.config`: `output: 'export'`, `trailingSlash: true`, `images.unoptimized: true`, `basePath` if project Pages.  
- `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` only. No `service_role`, no `AUTH_SECRET`, no `DATABASE_URL` in the web env.

### Develop

- `create-next-app` (TypeScript, ESLint, Tailwind, App Router).  
- shadcn + named Aceternity components. Token-correct shell: `/`, `/onboarding`, `/plan`.  
- GitHub Action: lint, typecheck, test, `next build`, upload `out/` to Pages.  
- `public/.nojekyll`.  
- Placeholder `src/data/client.ts` that throws a clear error if env is missing (implement for real in Phase 4).

### Review

- Production build is static (no server).  
- Phone can open the Pages URL (even if data is empty).  
- Bundle must not contain `service_role`.

### Gate

- [ ] lint + typecheck + export build  
- [ ] Pages URL loads  
- [ ] `output: 'export'` is set  
- [ ] `.env.example` has only public keys  

**Further planning if:** you need SSR after all — then Netlify/Vercel is a new ADR, not a silent switch.

### Implementation-agent prompt

```text
You are the Phase 3 scaffold agent. Read InitialPlan180826.md revision 2
and DESIGN.md. Load impeccable (shell only), ui-ux-pro-max.

Scaffold Next.js App Router + TypeScript + Tailwind in the repo root.
MUST set output:'export', unoptimized images, trailingSlash, and basePath
if this is a GitHub project site.

Wire shadcn + Aceternity registry. Apply DESIGN.md tokens. Placeholder
routes: /, /onboarding, /plan, /settings. No /login.

GitHub Action deploys out/ to GitHub Pages. Add .nojekyll.

Do not implement Prisma, NextAuth, or Server Actions (they break export).
Do not put service_role in any NEXT_PUBLIC_ variable.

Gate: lint, typecheck, static build, /impeccable audit on the home shell.
```

---

## Phase 4 — Supabase data gateway (no login)

**Goal:** The single user can persist a Profile through `src/data`, scoped by `DEFAULT_OWNER_ID`.

### Design

- SQL migrations + RLS as in §2.2.  
- `src/data/client.ts`, `src/data/owner.ts`, `src/data/profiles.ts`.  
- Human wizard: create Supabase project, paste URL + anon key into GitHub Actions secrets and `.env.local`.  
- CORS: add the GitHub Pages origin in Supabase Auth URL allow-list even before Auth is used (prevents a surprise in 4b).

### Develop

- Apply `0001_init.sql`.  
- Generate TypeScript types (`supabase gen types`).  
- Settings or onboarding can save height/weight and reload them after refresh.  
- Tests: gateway always sends `owner_id`; a mocked client never queries unscoped tables.

### Review

- Manual: save profile, hard refresh, data still there.  
- Confirm `service_role` is not in the repo or Pages bundle.  
- Policy comments describe the Phase 4b replacement.

### Gate

- [ ] Profile round-trip on Pages against live Supabase  
- [ ] All access via `src/data`  
- [ ] RLS enabled  
- [ ] Wizard/checklist for the owner’s dashboard clicks  

**Do not** build NextAuth. **Do not** block this phase on a login screen.

**Further planning if:** credentials are missing — stop and run the wizard; do not fake production.

### Implementation-agent prompt

```text
You are the Phase 4 data-gateway agent. Read InitialPlan180826.md §2.2
and the Phase 2 SQL draft. Load tdd, wizard, code-review.

Implement supabase-js behind src/data only. DEFAULT_OWNER_ID constant.
owner_id on every personal write. RLS on. No login UI.

If the owner has not created a Supabase project, write
docs/wizard/supabase-pages.md with exact dashboard clicks and stop.

Tests: unscoped queries are impossible through the gateway API.
Review with code-review. Do not add NextAuth or Prisma runtime.
```

---

## Phase 4b — Optional lock (after single-user testing) — DO NOT START IN V1

**Goal:** Add Supabase Auth **only when the owner asks**, after they have used the planner.

### Design

- Magic link, one email.  
- Settings → “Lock this data.”  
- Remap SQL: `update ... set owner_id = '<auth uid>' where owner_id = '<DEFAULT_OWNER_ID>'`.  
- RLS: drop open policy; `owner_id = auth.uid()`.  
- `getOwnerId()` from session.

### Develop

- `/lock` or Settings form. Session persistence in the existing browser client.  
- Empty state if signed out: explain why data is hidden, CTA to magic link.

### Review

- Signed-out anon cannot read/write personal rows.  
- Old `DEFAULT_OWNER_ID` rows are remapped, not orphaned.  
- Pages still static; no NextAuth.

### Gate

- [ ] Owner can sign in on the phone  
- [ ] RLS verified with a second incognito window  
- [ ] Remap script is a documented one-off, not a button that runs twice  

**Further planning if:** Google/Apple OAuth, multiple family members, or recovering from a leaked anon policy (rotate anon key).

### Implementation-agent prompt

```text
You are the Phase 4b auth bolt-on agent. ONLY run if the owner has tested
v1 without login and now wants a lock. Read §2.3 and
docs/decisions/0002-auth-ready-static.md.

Use Supabase Auth (magic link). Do not introduce NextAuth or a Node server.

Remap DEFAULT_OWNER_ID → auth.uid(), tighten RLS, switch getOwnerId() to
the session. Keep src/engine and meal/workout UI unchanged.

Prove with an incognito window that personal data is no longer public.
```

---

## Phase 5 — Onboarding + planning engine

**Goal:** Valid Profile + Goal → `plan_versions` row whose numbers match the spec.

### Design

- 4–5 short steps, no “create account.” Preview kcal / protein / weeks before commit.  
- Blocked-goal copy.

### Develop

- TDD `src/engine`. Persist via `src/data`.  
- Male and female fixtures; floors; loss cap.

### Review

- Fixtures match spec. Onboarding on 375px. Disclaimer on review step.

### Gate

- [ ] Engine tests green  
- [ ] PlanVersion persisted for `DEFAULT_OWNER_ID`  
- [ ] Unsafe goals blocked  
- [ ] `/impeccable critique` on onboarding  

### Implementation-agent prompt

```text
You are the Phase 5 engine agent. Read engine-spec.md and §5.3. Load tdd,
implement, impeccable, ui-ux-pro-max.

Pure engine first, then onboarding. Persist through src/data only
(owner_id from getOwnerId()). No login. Dummy meal titles OK.

Review: code-review + independent fixture check.
```

---

## Phase 6 — Recipes and meal plan UI

**Goal:** Breakfast, lunch, dinner, snacks hit macros; swaps work.

### Design

- MealCard, day strip, SwapSheet. Empty state if filters match nothing.

### Develop

- Seed `data/recipes.json`. `src/engine/meals.ts` TDD. Pins/swaps in Supabase.  
- Vegetarian never returns meat.

### Review

- 4-4-9 checksum. 375px sheet. `/impeccable polish`.

### Gate

- [ ] Seed size agreed  
- [ ] Assigner tests green  
- [ ] Swap + pin  
- [ ] Owner can cook 3 sample days  

### Implementation-agent prompt

```text
You are the Phase 6 meals agent. Read content-model.md and DESIGN.md.
Load tdd, refero-design, impeccable, ui-ux-pro-max.

JSON catalog in the repo. Assigner + mobile meal UI with swap/pin.
Personal rows via src/data (owner_id). No ScrapeGraphAI unless Phase 9
is open. No public recipe write API.
```

---

## Phase 7 — Exercise catalog and workout UI

**Goal:** Weekly sessions from equipment + days; swap/complete/skip.

### Design

- One-exercise-at-a-time on mobile. Deload copy. Timer optional (skip if it delays the gate).

### Develop

- `data/exercises.json`. `src/engine/training.ts`. Persist completions.

### Review

- Gym vs bodyweight tracks. No missing equipment. Critique cognitive load.

### Gate

- [ ] Training tests green  
- [ ] Complete/skip persisted  
- [ ] Volume from engine rules, not a gendered UI  

### Implementation-agent prompt

```text
You are the Phase 7 training agent. Read engine-spec training section and
DESIGN.md. Load tdd, refero-design, impeccable.

JSON exercise catalog, split generator, session UI. Equipment filters
mandatory. Persist through src/data. Text cues only.
```

---

## Phase 8 — Timelines, check-ins, plan access and updates

**Goal:** Reopen, follow, regenerate without destroying history.

### Design

- Timeline rail, weekly check-in, regenerate confirmation (pins kept).

### Develop

- Check-ins CRUD via gateway. PlanVersion list. Preview remaining timeline from latest weight.

### Review

- Playwright (or equivalent): onboard → meals → swap → workout complete → check-in → regenerate with pin.  
- Old versions read-only.  
- E2E uses `DEFAULT_OWNER_ID`; **do not** add a fake auth bypass that would have to be ripped out in 4b. Prefer a test Supabase schema or stubbed `src/data`.

### Gate

- [ ] Happy path green on CI  
- [ ] History preserved  
- [ ] Timeline cap enforced  

### Implementation-agent prompt

```text
You are the Phase 8 timeline agent. Read §4.1 update rules. Load tdd,
implement, code-review.

Check-ins, timeline, PlanVersion history, regenerate with pins.
E2E without a login. Stub src/data rather than disabling RLS globally.
No wearables.
```

---

## Phase 9 — Content pipeline (optional)

**Goal:** Grow the JSON catalog legally. Skip if seed is enough.

Laptop ingest → PR into `data/`. ScrapeGraphAI only for signed-off sources. Never on the request path. Never overwrite reviewed items blindly.

### Implementation-agent prompt

```text
You are the Phase 9 ingest agent. Read scrapegraph-content-ingest SKILL
and §4. If no approved sources, stop or stub USDA/wger laptop scripts.
Never import scrapegraphai into the Next.js client. JSON PRs only.
```

---

## Phase 10 — Polish and launch (still no auth unless 4b was requested)

**Goal:** Ship a mobile Pages app that feels intentional.

### Design

- `/impeccable polish` + `harden`. Reduced motion.

### Develop

- Loading/error/empty on primary routes. `noindex` if the owner wants the tool unlisted (further planning: `robots.txt` + unlisted repo does not hide a public Pages site).  
- README: local `next dev`, env, seed, Pages deploy, disclaimer, **how 4b will lock data**.  
- No auth rate limits to invent until 4b.

### Review

- Audit + Lighthouse a11y on Today, Onboarding, Meals.  
- iPhone Safari and Android Chrome.  
- Recheck bundle for `service_role`.

### Gate

- [ ] Audit defects fixed or waived  
- [ ] E2E green  
- [ ] Disclaimer on generate + footer  
- [ ] Owner launch approval  
- [ ] `docs/launch.md` notes public-anon risk until 4b  

### Implementation-agent prompt

```text
You are the Phase 10 launch agent. Load impeccable audit/polish/harden,
ui-ux-pro-max, code-review. No new features. No surprise login wall.

docs/launch.md: Pages URL, how to set GitHub secrets, reminder that
data is reachable via the anon key until Phase 4b.

If the owner now wants the lock, stop and hand off to Phase 4b rather
than improvising NextAuth.
```

---

## 7. Cross-cutting rules for implementation agents

1. Read this file, `DESIGN.md`, and `PRODUCT.md` before coding.  
2. TypeScript strict.  
3. Engine stays pure.  
4. **Static export on GitHub Pages** is the v1 host. Do not silently switch to Netlify.  
5. **No `service_role` in the client.** No secrets in git.  
6. **No NextAuth in v1.** Future auth = Supabase Auth (Phase 4b).  
7. **No unscoped personal queries.** Data gateway only.  
8. **`owner_id` on every personal row.**  
9. No medical guarantees. No default scraping.  
10. Refero + Impeccable + UX Pro Max + Aceternity (lightly) on new screens.  
11. If blocked on a §3 question, write a questionnaire — do not guess clinical policy.

---

## 8. Suggested first prompts (owner → agents)

**A.** Phase 0 prompt (docs, ADR for auth-ready static).  
**B.** Phase 1 prompt (DESIGN.md).  
**C.** Phase 3 then Phase 4 (scaffold export, then gateway). Phase 5 only after engine-spec exists.  
**D.** Phase 4b **only after** the owner has lived with the app and asks to lock it.

---

## 9. Out of scope for v1

- NextAuth.js / Auth.js  
- Prisma in the running website  
- Login, sign-up, OAuth, passwords  
- Native apps, wearables, AI body-scan photos  
- Grocery delivery, social, coaching marketplace  
- Commercial recipe scraping  
- Public multi-user SaaS  

---

## 10. What to expect (plain language)

You asked whether GitHub Pages can host this if Supabase holds the data, and whether login can wait.

**Yes.** The website can be a folder of files on github.io. The phone talks to Supabase the same way a notes app talks to the cloud. You do not need Netlify or NextAuth for that.

**A database is still worth it** for one person: otherwise the plan dies when the browser cache dies.

**Login is optional later.** v1 will behave as “this phone and this URL are enough.” That means a stranger who finds a **public** Pages site could also see the data. When you have tested the planner and want a lock, we add a magic-link sign-in on the same static site, tighten the database rules, and keep the screens you already use.

What this document gives you is a **phased map**: design the look, prove the calorie maths, put the app on GitHub Pages, save your stats in Supabase, then meals, workouts, and timelines — with the wiring already in place so a lock can be added without starting again.
