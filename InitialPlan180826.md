# Initial Plan — Body composition diet & exercise planner

**Document:** `InitialPlan180826.md`  
**Date:** 18 August 2026  
**Status:** Planning (no application code yet)  
**Working title:** BodyPlan *(replace after the product-name question is answered)*  
**Audience:** Implementation agents and the product owner  
**Stack (requested):** Next.js · TypeScript · React · Tailwind CSS · Aceternity UI · NextAuth.js · Prisma · Supabase

This document is the source of truth until a later plan supersedes it. Every implementation phase must **design → develop → review**, then stop at the listed gate. Do not start a later phase until its gate is green, or until the owner explicitly waives a question in writing.

---

## 1. What we are building (plain language)

A **mobile-first web app** that takes a person's sex, age, height, weight, and body-composition numbers, then produces:

1. A **calorie and macro target** that is safe for the chosen timeline.
2. A **meal plan** with breakfast, lunch, dinner, and snacks whose recipes add up to those targets.
3. An **exercise plan** that supports fat loss, muscle retention, or recomposition.
4. A **custom timeline** (for example 8, 12, or 16 weeks) with weekly checkpoints so the user can see whether they are on track.

The app is a **planner and tracker**, not a doctor. Every generated plan must show a short medical disclaimer. It does not diagnose, treat, or claim guaranteed results.

---

## 2. Hosting and database advice (read this first)

### 2.1 GitHub Pages (`*.github.io`) is not enough for this product

GitHub Pages only serves **static files**. A Next.js app can be forced onto it with `output: 'export'`, but that export **cannot** run:

| Requested feature | Why GitHub Pages breaks it |
| --- | --- |
| NextAuth.js | Needs API routes, cookies, and OAuth callback URLs on a real server |
| Prisma → Supabase | Needs a server (or at least a trusted backend) to hold `DATABASE_URL` |
| Custom plans per user | Needs a database, not a single HTML file |
| Updating recipes / workouts | Needs write APIs or a CMS, not a rebuild of static HTML every time |
| Secrets | `AUTH_SECRET` and DB URLs cannot be hidden in a static bundle |

**Verdict:** GitHub Pages is fine for a **brochure or in-browser calculator demo**. It is the **wrong host** for logged-in, per-user diet and training plans.

### 2.2 Is a database (Supabase) required?

**Yes, if the product matches the brief** (different users, saved body-comp data, custom plans, recipes, workouts, and timelines that can be opened again later).

| Path | Database? | Auth? | What the user gets |
| --- | --- | --- | --- |
| **A. Calculator demo** | No. `localStorage` only | No | One device, plans vanish if storage is cleared, no sync |
| **B. Personal product (recommended)** | **Yes — Supabase Postgres via Prisma** | **Yes — NextAuth.js** | Accounts, saved profiles, plan history, content updates |
| **C. Static marketing site + hosted app** | Yes, on the app host only | Yes, on the app host only | `github.io` for the story; Netlify/Vercel for the app |

**Recommendation: Path B on Netlify or Vercel, with Supabase as Postgres.** Netlify is a good default here because this workspace already has Next.js-on-Netlify guidance. Vercel is equally valid. Render is a fallback if you want a long-running Node service instead of serverless.

Do **not** mix Supabase Auth and NextAuth.js in v1. Use **NextAuth.js (Auth.js v5) for login** and **Supabase only as the Postgres database** Prisma talks to. That matches the requested stack without two competing identity systems.

### 2.3 Hosting decision (gate for Phase 3)

Until the owner picks a host, implementation agents must **not** configure GitHub Pages static export as the production target.

**Preferred production target**

- Host: **Netlify** (or Vercel)
- Database: **Supabase Postgres**
- ORM: **Prisma** with `DIRECT_URL` (migrations) and pooled `DATABASE_URL` (runtime)
- Auth: **NextAuth.js** with Prisma adapter, Google + magic-link (email) to start

**Allowed exception:** a throwaway **Phase 1 HTML prototype** may be opened locally or dropped on GitHub Pages. That prototype is research, not the product.

---

## 3. Open questions (answer before Phase 2 coding)

Implementation agents must **not invent answers**. If a question is unanswered, stop and write the assumed default in a PR comment, then wait.

### Product and people

1. **Product name and voice?** Working title is BodyPlan. Is this a public app, a private tool for one household, or a branded “Katie’s Adventures” chapter?
2. **Who is the user?** Adults only (recommended 18+)? Any coaching relationship (you write the plan, they follow it)?
3. **Sex / gender model?** The brief says male or female (needed for Mifflin–St Jeor BMR). Should the UI also offer “prefer not to say” (then require a manual BMR or a chosen formula), or stay binary for v1?
4. **Units?** Metric, imperial, or toggle (recommended: toggle, store metric internally).
5. **Body composition source?** DEXA, InBody/Tanita, calipers, Navy-method tape estimate, or “I only know weight”? This changes which fields are required vs optional.
6. **Primary goal mix?** Fat loss only, fat loss + muscle retain, full recomposition, or also a maintain/gain track?

### Nutrition and training

7. **Dietary constraints?** Vegetarian, vegan, pescatarian, gluten-free, dairy-free, halal/kosher, allergies, budget, max cooking minutes, servings (1 vs family)?
8. **Kitchen reality?** Batch-cook friendly? Leftovers as next-day lunch? Eating out days?
9. **Training setting?** Full gym, home dumbbells, bands only, bodyweight only, or a mix? Days per week the user can actually train?
10. **Cardio preference?** Walking, Zone 2, intervals, none beyond steps?
11. **Timeline rules?** Owner picks any end date, or the engine proposes a range and blocks unsafe speed (recommended)?
12. **Recipe source for v1?** See §4. Default recommendation: **owned seed catalog**, not live scraping.
13. **Exercise source for v1?** Same: owned catalog, optionally enriched later from wger.de.

### Account, legal, content ops

14. **Auth providers?** Google, Apple, email magic link, username/password? (Recommend Google + magic link; skip passwords in v1.)
15. **Medical disclaimer copy** — who signs off? Any conditions that must hard-stop plan generation (pregnancy, eating-disorder history, BMI below a floor, under 18)?
16. **Who may edit the global recipe/exercise library?** Owner only, or a future admin role?
17. **May users edit their own plan** (swap meals, swap lifts) or only follow a locked plan?
18. **Progress data** — weight only, tape measurements, photos, mood, sleep, cycle? Photos are sensitive; default v1 is **no photos**.
19. **Locale / language?** English only for v1?
20. **Hosting confirmation** — Netlify + Supabase, Vercel + Supabase, or insist on GitHub Pages anyway (which forces Path A)?

### Suggested defaults if the owner is silent after a grilling session

Use these **only** when the owner says “use defaults”:

- Adults 18+, binary sex for BMR, unit toggle, fat-loss + muscle retain as default goal.
- Optional body-fat %; if missing, plan from weight + waist (Navy) or weight-only with a conservative deficit.
- Omnivore catalog with vegetarian filter. Gym + home dumbbell tracks.
- Engine proposes timeline; user may slow it down, not speed it past safety caps.
- Owned recipe + exercise seed data. Users can swap meals and exercises. No photos. Google + magic link. Netlify + Supabase.

---

## 4. How to access and update recipes and exercise plans

This is the content strategy. Pick one primary path for v1; the others are later phases.

### 4.1 Recommended v1: owned catalog in Supabase

Keep recipes and exercises as **first-party rows** Prisma owns.

**Why this wins for a low-complexity personal app**

- No API bill, no scrape ToS risk, no broken third-party images.
- Macros are known and testable.
- Plans stay reproducible (same seed → same week 1).
- Updates are a seed file or an admin form, not a brittle crawler.

**Minimum catalog size for a credible v1**

- ~40 breakfasts, ~40 lunches, ~40 dinners, ~25 snacks (with vegetarian coverage).
- ~50–80 exercises covering squat, hinge, push, pull, lunge, carry, core, Zone 2.

**How the user *accesses* a plan**

| Surface | Behaviour |
| --- | --- |
| Today | Four meal cards + today’s workout, large checkboxes, one-thumb layout |
| This week | 7-day strip; tap a day to open |
| Plan | Goal, timeline, calories, macros, weekly training split, “why this plan” |
| Library | Search recipes/exercises; favourite; “use this instead” |
| History | Past weeks stay frozen so progress is honest |

**How the user *updates* a plan**

| Action | Rule |
| --- | --- |
| Swap a meal | Offer 3 alternatives in the same slot within ±10% kcal and ±20% protein |
| Shuffle a day | Re-roll all four slots that still match remaining macros |
| Pin a recipe | Never auto-replace pinned items on regenerate |
| Log “I ate something else” | Optional kcal/protein note; does not rewrite the forward plan unless they tap Regenerate |
| Swap an exercise | Same movement pattern + available equipment |
| Skip / deload | Mark session skipped; if 2+ skips in a week, suggest a deload prompt |
| Profile change (weight, goal, timeline) | **Do not silently overwrite.** Create `PlanVersion` n+1, keep n read-only |
| Content library update | New recipes appear in **future** swaps only, not in locked past days |

### 4.2 Licensed APIs (Phase 9, optional)

Use these to *grow* the catalog, still stored in Prisma:

- **Nutrition facts:** USDA FoodData Central (free, good for ingredients).
- **Recipes:** Spoonacular or Edamam (paid quotas; cache everything).
- **Exercises:** [wger.de](https://wger.de) (open) or ExerciseDB via a licensed RapidAPI plan.

Never call these APIs on every page view. Nightly or on-demand ingest → review → upsert.

### 4.3 ScrapeGraphAI (Phase 9, gated)

ScrapeGraphAI is installed as a **local ingest skill**, not as a runtime dependency of the website.

**Allowed:** public-domain / CC-licensed pages, government nutrition pages, the owner’s own site, sources with written permission.

**Not allowed:** scraping commercial recipe or workout sites, copying photos, or generating a user’s daily menu by crawling the live web.

Every scrape job must follow `.agents/skills/scrapegraph-content-ingest/SKILL.md`: legal note in `docs/content-sources.md`, JSON contract, macro checksum, `reviewed: false`, PR review, then seed.

### 4.4 Admin / owner update loop (suggested)

**v1 (no admin UI):** edit `prisma/seed/recipes.json` and `exercises.json`, run `prisma db seed`, PR review.

**v1.5:** a protected `/admin` route (owner email allow-list) with CRUD and a “mark reviewed” flag.

**v2:** user-submitted recipes in a moderation queue (out of scope until v1 ships).

---

## 5. Architecture (target Path B)

```
Mobile browser
    │
    ▼
Next.js App Router (TypeScript)  ── Tailwind + Aceternity UI + shadcn primitives
    │
    ├── NextAuth.js (Auth.js v5)  Google + magic link
    ├── Server Actions / Route Handlers (no static export)
    └── Prisma Client
            │
            ▼
     Supabase Postgres
```

### 5.1 App surfaces (mobile web)

| Route | Purpose |
| --- | --- |
| `/` | Marketing + “See a sample plan” |
| `/login` | NextAuth sign-in |
| `/onboarding` | Sex, age, height, weight, body comp, goal, timeline, diet, equipment |
| `/plan` | Current plan home (today + week) |
| `/plan/meals` | Meal calendar + swap |
| `/plan/workouts` | Training calendar + swap |
| `/plan/timeline` | Goal date, projected weight/BF%, check-ins |
| `/log` | Weigh-in and adherence |
| `/recipes/[slug]` | Recipe detail |
| `/exercises/[slug]` | Exercise detail |
| `/settings` | Profile, units, regenerate with confirmation |
| `/admin` | Later |

Design these as a **product app** (Impeccable product lane), not a marketing-template with nested cards. Bottom navigation on small screens: Today · Plan · Log · You.

### 5.2 Domain model (draft — refine in Phase 2)

Prisma models (names are working vocabulary for `CONTEXT.md`):

- `User` — NextAuth fields plus `role` (`user` \| `owner`).
- `Profile` — `sex`, `birthDate`, `heightCm`, `weightKg`, optional `bodyFatPct`, `waistCm`, `hipCm`, `activityLevel`, `dietFlags[]`, `equipment[]`, `injuriesNote`.
- `Goal` — `type` (`fat_loss` \| `recomp` \| `maintain`), `targetWeightKg`, `targetBodyFatPct`, `startOn`, `endOn`, `weeklyLossCapPct`.
- `Plan` — immutable header: calorie target, macros, split, `status`.
- `PlanVersion` — snapshot of generator inputs + outputs (regenerations).
- `DayPlan` — date, `kcalTarget`, slot assignments.
- `MealSlot` — `breakfast` \| `lunch` \| `dinner` \| `snack`, recipe, servings, pinned.
- `WorkoutSession` — date, focus, estimated minutes.
- `WorkoutItem` — exercise, sets, reps or minutes, rest, swappedFromId.
- `CheckIn` — date, weight, optional waist, energy 1–5, notes.
- `Recipe`, `IngredientLine`, `Exercise` — catalog.
- `Favorite` — user ↔ recipe or exercise.

Auth.js required tables: `Account`, `Session`, `VerificationToken` (and `Authenticator` if passkeys come later).

### 5.3 Planning engine (draft — must be unit-tested in Phase 5)

Pure TypeScript module `src/engine/` with **no React and no Prisma**. Easy to TDD.

1. **BMR** — Mifflin–St Jeor:  
   male `10w + 6.25h − 5a + 5`, female `10w + 6.25h − 5a − 161` (kg, cm, years).
2. **TDEE** — BMR × activity factor (sedentary 1.2 … extra 1.725). Prefer a conservative factor if the user is unsure.
3. **Target rate** — default 0.5% of body weight per week; hard cap 1.0% (or ~0.5–1.0 kg/week for higher body weights). Never prescribe below an absolute calorie floor (proposed: **not below BMR**, and not below **1200 kcal** women / **1500 kcal** men without a further-planning flag for a dietitian review).
4. **Timeline** — `weeks = max(8, ceil(gapKg / weeklyKg))`. If the user demands a faster date, **refuse and explain**, offer the fastest safe date.
5. **Macros** — protein 1.6–2.2 g/kg actual (or per kg goal weight if obese — **Phase 2 must decide**); fat ≥ 0.7 g/kg; carbs fill the remainder.
6. **Meals** — greedy + random-restart knapsack over recipes tagged for the slot, respecting diet flags, cooking time, and leftover rules.
7. **Training** — 3 resistance + 2 Zone 2 as the fat-loss default; push/pull/legs or full-body 3× based on days available; deload every 4th week. Programming is similar for males and females; loads and energy intake differ, the movement menu does not.

**Safety flags that block auto-generation and require a human message**

- Age < 18  
- BMI < 18.5  
- Requested loss faster than the cap  
- Pregnancy / medical notes (if collected)  
- Very low energy availability after calculation  

This engine is **wellness maths**, not clinical care. Copy must say so.

### 5.4 UI kit rules

- **Tailwind CSS** for layout and tokens.
- **Aceternity UI** via shadcn registry (`npx shadcn@latest add @aceternity/...`) for motion-heavy marketing and a few product flourishes (bento dashboard, animated tabs). Do not Aceternity-wrap every form control.
- **shadcn/ui** primitives for forms, dialogs, sheets (mobile swap sheet).
- **Lucide** (or Phosphor) SVGs — no emoji-as-icon.
- Mobile-first: 44×44 touch targets, thumb-zone primary CTA, `prefers-reduced-motion`.

### 5.5 Skills already installed in this repo

Implementation agents **must** load the skill that owns the task:

| Skill | Path | Use for |
| --- | --- | --- |
| Refero Design | `.agents/skills/refero-design` | Research-first UI: styles, screens, flows before pixels |
| Impeccable | `.cursor/skills/impeccable` | `init`, `shape`, `craft`, `audit`, `critique`, `polish` |
| UI/UX Pro Max | `.agents/skills/ui-ux-pro-max` | Style/palette/type search, UX checklist, fitness/habit-tracker patterns |
| Matt Pocock set | `.agents/skills/*` | `grill-with-docs`, `tdd`, `implement`, `code-review`, `domain-modeling`, `to-spec` |
| ScrapeGraph ingest | `.agents/skills/scrapegraph-content-ingest` | Legal, reviewed catalog ingest only |

Also configured: Impeccable Cursor agents and hooks under `.cursor/`.

**First design session on a machine:** run `/impeccable init` (product lane, not brand-only) so `PRODUCT.md` and `DESIGN.md` exist. Run `/setup-matt-pocock-skills` if you want GitHub issues as the tracker; otherwise keep tickets in `docs/tickets.md`.

---

## 6. How every phase is gated

Each phase below has the same inner loop:

1. **Design** — research, spec, or UX; no unplanned coding.
2. **Develop** — smallest vertical slice; TDD for engine/data; UI against `DESIGN.md`.
3. **Review** — automated tests **and/or** a named further-planning checkpoint.
4. **Gate** — binary. Red means stop.

Do not “just start the next phase” because the previous one compiled.

---

## Phase 0 — Align and freeze the brief

**Goal:** Turn this document plus owner answers into a frozen v1 scope.

### Design

- Run a grilling session (`grill-with-docs` / `grill-me`) over §3.
- Write `PRODUCT.md` (audience, jobs-to-be-done, anti-goals, voice).
- Start `CONTEXT.md` glossary: Profile, Goal, PlanVersion, MealSlot, CheckIn, Engine.
- Confirm Path B hosting (or an explicit Path A waiver).

### Develop

- No application code.
- Capture answers in `docs/decisions/0001-v1-scope.md` (ADR).
- Optional: `docs/tickets.md` skeleton with phase tickets.

### Review

- Owner reads ADR and `PRODUCT.md`.
- Check that unsafe medical claims are banned in copy.

### Gate

- [ ] §3 questions answered or defaults accepted in writing  
- [ ] Host + database decision recorded  
- [ ] Recipe/exercise source for v1 recorded  
- [ ] `PRODUCT.md` exists  

**Further planning if:** the owner wants clinical dietetics, under-18 users, or GitHub Pages as the only host.

### Implementation-agent prompt

```text
You are the Phase 0 planning agent for this repo. Read InitialPlan180826.md
end to end. Load skills: grill-with-docs, domain-modeling, writing-for-agents.

Do not write application code. Do not scaffold Next.js.

Tasks:
1. Interview using the open questions in §3. If you cannot reach the owner,
   stop after writing docs/questionnaires/phase-0.md with the unanswered
   list — do not invent product facts.
2. If answers exist in the conversation or in docs/, write:
   - PRODUCT.md
   - CONTEXT.md (glossary only)
   - docs/decisions/0001-v1-scope.md
3. Record the hosting decision. If GitHub Pages is still requested as the
   only host, explain Path A vs Path B again and wait.
4. Stop at the Phase 0 gate. Open a PR with docs only.

Review: another agent should confirm no silent scope creep (no social feed,
no wearables, no photo body-scan, no live web scraping in v1).
```

---

## Phase 1 — UX research and design system

**Goal:** A distinctive mobile product UI direction, not generic AI SaaS purple.

### Design

- Load **refero-design**. Research fitness onboarding, daily habit home, meal cards, workout players (MyFitnessPal, Strong, Future, Lifesum, Hevy — synthesise, do not clone).
- Load **ui-ux-pro-max**. Search product type: habit tracker + recipe + fitness. Pick one style, one palette, one type pairing. Record anti-patterns.
- Load **impeccable**. `/impeccable init` then `/impeccable shape` for: onboarding, today, meal swap sheet, workout session, timeline.
- Choose 4–6 Aceternity components max (example: hero on `/`, bento on plan overview, animated tab on meals/workouts). Rest is calm product UI.
- Produce wireflows: first-run → first plan in under 3 minutes.

### Develop

- Write `DESIGN.md` (tokens, type, radius, motion, dark/light).
- Optional throwaway HTML prototype (`/prototype` skill) of Today + Onboarding. This may be static. It is not the Next.js app.
- Component inventory: Button, MacroRing, MealCard, SessionCard, SwapSheet, TimelineRail, CheckInForm.

### Review

- `/impeccable critique` on the prototype.
- Accessibility pass: contrast 4.5:1, 44px targets, labels not placeholders.
- Mobile 375 / 390 and 430 widths.

### Gate

- [ ] `DESIGN.md` and `PRODUCT.md` exist  
- [ ] Reference lock listed (apps + why)  
- [ ] Prototype or high-fidelity frames for 5 core screens  
- [ ] Owner visual thumbs-up **or** a written “agent may proceed with DESIGN.md”  

**Further planning if:** the owner wants a fully custom illustration system or native iOS/Android (out of scope; this is mobile web).

### Implementation-agent prompt

```text
You are the Phase 1 design agent. Read InitialPlan180826.md, PRODUCT.md if
present, and the Phase 0 ADR. Load refero-design, ui-ux-pro-max, impeccable,
and prototype.

Rules:
- Research before pixels. Name real app references. Do not average them.
- Product lane (app UI), not a marketing landing as the whole product.
- Mobile-first. Aceternity is seasoning, not the meal.
- No Next.js scaffold unless Phase 0 gate is green AND you only need a
  static prototype route. Prefer a single HTML prototype if faster.

Deliver:
1. DESIGN.md (tokens, type, color, motion, anti-references)
2. docs/ux/flows.md (onboarding, today, swap meal, complete workout, check-in)
3. docs/ux/component-inventory.md
4. A clickable prototype of onboarding + today + swap sheet
5. A short critique notes file from /impeccable critique

Gate: stop for owner review of DESIGN.md. Do not start Prisma or Auth.
```

---

## Phase 2 — Domain model and engine spec

**Goal:** A testable specification of data and maths before UI implementation.

### Design

- Domain-modeling pass: stress-test Profile vs Goal vs Plan vs PlanVersion.
- Decide body-fat missing behaviour, protein rule, calorie floors, leftover rule.
- Draw ERD (Mermaid in `docs/domain/erd.md`).
- Specify generator inputs/outputs as TypeScript types in the spec (even if the file is `.md` until Phase 5).

### Develop

- `docs/domain/engine-spec.md` with formulas, caps, examples (worked numbers for one male and one female fixture).
- Draft `prisma/schema.prisma` as a **proposal** (may wait to apply until Phase 4).
- List seed recipe tags and exercise movement patterns.

### Review

- Independent recalculation of the two worked examples on paper.
- Check eating-disorder / low-BMI stop conditions.
- `to-spec` the engine so Phase 5 can TDD it.

### Gate

- [ ] Worked examples match the spec  
- [ ] ERD reviewed  
- [ ] Open medical/legal questions either closed or parked as hard-stops in the engine  
- [ ] Owner agrees calorie floors and weekly loss cap  

**Further planning if:** you want athlete periodisation, medical conditions, or continuous glucose — that is a different product.

### Implementation-agent prompt

```text
You are the Phase 2 domain agent. Read InitialPlan180826.md, PRODUCT.md,
DESIGN.md, and Phase 0 answers. Load domain-modeling, to-spec, tdd
(spec only — you may write example fixtures, not production React).

Deliver:
1. docs/domain/erd.md (Mermaid)
2. docs/domain/engine-spec.md with formulas, safety caps, and two
   fully worked examples (one male, one female) including timeline
3. docs/domain/content-model.md (Recipe, Exercise, tags, swap rules)
4. A proposed prisma/schema.prisma (do not run migrate unless Phase 4
   has started and credentials exist)
5. CONTEXT.md updates for any new ubiquitous language

Do not implement the generator yet beyond spec fixtures.
Review: a second agent must recompute the worked examples independently.
Gate: stop if any formula is underspecified.
```

---

## Phase 3 — Next.js scaffold, Tailwind, Aceternity, CI

**Goal:** A typed Next.js app that deploys to the chosen **serverful** host, not GitHub Pages.

### Design

- Confirm App Router, `src/` layout, path aliases, font loading from `DESIGN.md`.
- `components.json` with `@aceternity` registry.
- Env contract: `.env.example` with `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL`, OAuth ids, `NEXTAUTH_URL`.

### Develop

- `npx create-next-app` (TypeScript, ESLint, Tailwind, App Router).
- shadcn init; add `cn`, button, input, sheet, tabs, dialog.
- Register Aceternity; add only the components named in Phase 1.
- GitHub Action: `lint`, `typecheck`, `test` (placeholder until tests exist).
- Netlify (`netlify.toml` + Next runtime) **or** Vercel project config.
- Bind nothing to GitHub Pages `output: 'export'`.
- `.gitignore` already has `.env`, `.netlify`, `.next`.

### Review

- `npm run build` on the host’s Node version.
- Empty pages render at `/` with design tokens (no Inter-on-purple-gradient default).
- Lighthouse sanity on `/` (perf not a blocker yet; a11y contrast is).

### Gate

- [ ] Typecheck + lint clean  
- [ ] Preview deploy URL works on a phone  
- [ ] No `output: 'export'`  
- [ ] `.env.example` documented  

**Further planning if:** the owner still demands github.io-only — switch to Path A (localStorage calculator) and **drop NextAuth + Prisma from v1**, which is a new plan.

### Implementation-agent prompt

```text
You are the Phase 3 scaffold agent. Read InitialPlan180826.md, DESIGN.md,
and the hosting ADR. Load setup-ts-deep-modules if useful, impeccable
(only for the empty shell visual), ui-ux-pro-max.

Scaffold Next.js (App Router, TypeScript, Tailwind) in the repo root
unless a subfolder was decided. Wire shadcn + Aceternity registry.
Apply DESIGN.md tokens in globals.css. Create a token-correct home
shell and a placeholder /login, /onboarding, /plan.

Hosting: Netlify or Vercel as recorded. Do NOT set output:'export'.
Do not add Prisma credentials to the client bundle.

Deliver working preview deploy instructions in README.
Gate: lint + typecheck + build. Then stop. No Auth implementation yet.
After develop, run a brief /impeccable audit on the home shell.
```

---

## Phase 4 — NextAuth.js + Prisma + Supabase

**Goal:** A real user can sign in and persist a Profile row.

### Design

- Auth.js v5 + Prisma adapter against Supabase Postgres.
- OAuth redirect URLs for local, preview, and production.
- Session: JWT vs database sessions — prefer **database sessions** so logout is real.
- RLS: either Prisma uses the service role on the server only (simplest v1) **or** map NextAuth to Supabase JWT (further planning — do not DIY mid-phase). Recommended v1: **server-only Prisma**, no client Supabase key for user data.

### Develop

- Provision Supabase project (owner must supply URLs and keys via env).
- Prisma schema: Auth tables + `Profile`.
- Migrations. Seed an owner email if needed.
- `/login` UI from DESIGN.md.
- Server helpers: `auth()`, `requireUser()`.
- Settings page: edit display name.

### Review

- Integration test: magic-link or mock adapter in CI.
- Manual: sign in, refresh, sign out, profile row exists.
- Confirm secrets are not in git.

### Gate

- [ ] Sign-in / sign-out works on preview  
- [ ] Profile CRUD for the logged-in user only  
- [ ] Prisma migrate on staging  
- [ ] CI uses a throwaway DB or mocked adapter  

**Further planning if:** you need RLS-from-the-browser or multi-tenant coaches.

### Implementation-agent prompt

```text
You are the Phase 4 auth/data agent. Read InitialPlan180826.md and
docs/domain/erd.md. Load tdd, diagnosing-bugs, wizard (for any owner
dashboard steps that only a human can click).

Implement Auth.js (NextAuth v5) with Prisma adapter and Supabase
Postgres. Keep Prisma on the server. Follow .env.example.

Deliver:
- prisma/schema.prisma migrated
- login + session-aware layout
- Profile create-on-first-login
- tests for "cannot read another user's profile"

Do not build the meal generator yet.
If SUPABASE credentials are missing, write a wizard script / checklist
and stop — do not fake a production database.
Review with /code-review (standards + spec).
```

---

## Phase 5 — Onboarding + planning engine

**Goal:** Given a valid Profile + Goal, persist a PlanVersion with numbers that match the spec.

### Design

- Onboarding as 4–5 short steps (not one long form): body, goal, diet, training, review.
- Show a preview: “About X kcal, Y g protein, Z weeks” before commit.
- Copy for blocked unsafe goals.

### Develop

- Implement `src/engine/` with TDD from `engine-spec.md`.
- Onboarding writes Profile + Goal and calls the engine.
- Persist Plan + empty day slots (meals/workouts may be placeholders).
- Unit tests for fixtures from Phase 2 (male and female).
- Property-ish tests: calorie floor, loss cap, timeline rounding.

### Review

- Re-run the two worked examples — must match within rounding rules.
- UX: onboarding on a 375px device, keyboard, errors next to fields.
- Disclaimer visible on the review step.

### Gate

- [ ] Engine tests green  
- [ ] Onboarding creates a PlanVersion  
- [ ] Unsafe goals blocked with an explanation  
- [ ] `/impeccable critique` on onboarding  

**Further planning if:** you want lab-accurate DEXA ingestion (CSV upload) — park it.

### Implementation-agent prompt

```text
You are the Phase 5 engine agent. Read docs/domain/engine-spec.md and
InitialPlan180826.md §5.3. Load tdd, implement, impeccable (onboarding UI),
ui-ux-pro-max (forms).

Red-green-refactor the engine as a UI-free module first. Only then
wire onboarding.

Cover male and female fixtures, missing body-fat fallback, timeline
caps, and calorie floors. Persist PlanVersion.

Review: code-review + independent fixture check.
Do not scrape recipes. Dummy meal titles are OK if Phase 6 is not started.
```

---

## Phase 6 — Recipes and meal plan UI

**Goal:** Each plan day has breakfast, lunch, dinner, snack(s) that hit macros; user can swap.

### Design

- MealCard, Day strip, SwapSheet (Aceternity/motion optional).
- Empty states if catalog cannot match filters — never silent fail.
- Recipe detail: ingredients, steps, macros, tags.

### Develop

- Seed recipes (JSON) with diet tags and slot tags.
- Assigner in `src/engine/meals.ts` (TDD): match kcal/protein windows.
- UI: `/plan/meals`, swap, pin, leftover flag.
- Tests: vegetarian-only never returns meat; swap stays in window.

### Review

- Nutrition checksum on seed data.
- Mobile sheet usability (thumb reach, 44px).
- `/impeccable polish` on meal surfaces.

### Gate

- [ ] Seed ≥ the Phase 1 agreed counts (or documented smaller MVP)  
- [ ] Assigner tests green  
- [ ] Swap + pin work  
- [ ] Owner can cook through 3 sample days without a missing ingredient list  

**Further planning if:** grocery aggregator, Instacart, or barcode logging is requested.

### Implementation-agent prompt

```text
You are the Phase 6 meals agent. Read docs/domain/content-model.md and
DESIGN.md. Load tdd, refero-design (meal tracker screens), impeccable,
ui-ux-pro-max.

Implement the owned recipe catalog, day assigner, and mobile meal UI
with swap/pin. Seed data must include vegetarian coverage.

Do not use ScrapeGraphAI unless docs/content-sources.md already lists
an allowed source and Phase 9 is explicitly opened.

Review seed macros (4-4-9 checksum). Gate on tests + a 375px walkthrough.
```

---

## Phase 7 — Exercise catalog and workout plan UI

**Goal:** A week of sessions that matches equipment and days available; user can swap and complete.

### Design

- Session player: one exercise at a time on mobile, rest timer optional (v1: skip timer if it delays the gate).
- Swap sheet by movement pattern.
- Rest / deload week explanation.

### Develop

- Seed exercises.
- `src/engine/training.ts` (TDD): split by days and equipment.
- UI: `/plan/workouts`, complete/skip, swap.
- Link sessions to the same PlanVersion.

### Review

- Beginner gym vs bodyweight tracks both generate.
- No exercise that needs missing equipment.
- Critique session UX (cognitive load).

### Gate

- [ ] Training tests green  
- [ ] Complete/skip persisted  
- [ ] Female and male profiles get appropriate volume **via the engine rules**, not a “pink” UI  

### Implementation-agent prompt

```text
You are the Phase 7 training agent. Read engine-spec.md training section
and DESIGN.md. Load tdd, refero-design (workout player flows), impeccable.

Implement owned exercise catalog, weekly split generator, and mobile
session UI with swap/complete/skip. Equipment filters are mandatory.

No video scraping. Cues as text. Optional YouTube links only if the
owner supplies a licensed or official list.

Review with code-review and a phone-sized walkthrough.
```

---

## Phase 8 — Timelines, check-ins, plan access and updates

**Goal:** The user can reopen, follow, and safely regenerate a plan.

### Design

- Timeline rail: start, today, goal date, projected vs actual weight.
- Check-in: weekly default, optional extra weigh-ins.
- Regenerate confirmation: what changes, what is pinned, history kept.

### Develop

- `CheckIn` CRUD.
- Recalculate remaining timeline from latest weight (preview first).
- PlanVersion list (“12 Jun plan” vs “3 Jul plan”).
- Notifications: none in v1 unless owner insists (further planning: web push).

### Review

- E2E (Playwright): onboard → see meals → swap → complete workout → check-in → regenerate with pin preserved.
- Regression: old PlanVersion still read-only.

### Gate

- [ ] Playwright (or equivalent) happy path green on CI  
- [ ] Regenerating does not destroy history  
- [ ] Timeline cannot be set faster than the cap  

### Implementation-agent prompt

```text
You are the Phase 8 persistence/timeline agent. Read InitialPlan180826.md
§4.1 update rules. Load tdd, implement, code-review.

Build check-ins, timeline view, PlanVersion history, and regenerate
with pin preservation. Add Playwright e2e for the happy path.

No third-party fitness wearables.
If e2e is flaky on auth, use a documented test user strategy, not a
security bypass in production.
```

---

## Phase 9 — Content pipeline (APIs / ScrapeGraphAI)

**Goal:** A repeatable, legal way to grow the catalog. **Optional.** Skip if the seed catalog is enough.

### Design

- `docs/content-sources.md` table: source, license, allow-scrape?, owner sign-off.
- Review workflow: `reviewed: false` until checked.

### Develop

- Ingest scripts under `tools/ingest/` (Node or Python venv).
- ScrapeGraphAI only for signed-off sources (skill: scrapegraph-content-ingest).
- Prisma upsert by slug. Never overwrite `reviewed: true` without a flag.

### Review

- Legal pass. Macro checksum. Duplicate slug detection.
- Sample of 10 items cooked/read by a human.

### Gate

- [ ] At least one allowed source fully documented  
- [ ] No commercial scrape  
- [ ] Ingest is offline/manual, not on the request path  

**Further planning if:** you want a public UGC recipe community.

### Implementation-agent prompt

```text
You are the Phase 9 ingest agent. Read
.agents/skills/scrapegraph-content-ingest/SKILL.md and §4 of
InitialPlan180826.md.

If docs/content-sources.md has no owner-approved sources, do not scrape.
Instead add a Spoonacular/USDA/wger adapter stub behind env keys, or
stop and request sources.

Never import scrapegraphai into the Next.js client.
Review: license, checksum, PR with reviewed:false data only.
```

---

## Phase 10 — Polish, accessibility, launch

**Goal:** Ship a mobile web app that feels intentional and does not harm.

### Design

- `/impeccable polish` and `/impeccable harden` (errors, empty, offline-ish messaging).
- UX Pro Max pre-delivery checklist.
- Final motion: respect `prefers-reduced-motion`.

### Develop

- Loading/error/empty for every primary route.
- SEO only on public `/`; app routes `noindex`.
- Rate-limit auth routes.
- README: local dev, env, seed, deploy, disclaimer.

### Review

- `/impeccable audit` + Lighthouse a11y on Today, Onboarding, Meals.
- `code-review` on the full diff since Phase 3.
- Manual iPhone Safari and Android Chrome pass.

### Gate

- [ ] Audit defects fixed or waived in writing  
- [ ] E2E still green  
- [ ] Disclaimer on generate + footer  
- [ ] Owner launch approval  

### Implementation-agent prompt

```text
You are the Phase 10 launch agent. Read DESIGN.md and this plan's
gates. Load impeccable (audit, polish, harden), ui-ux-pro-max,
code-review.

Fix a11y, empty/error states, auth rate limits, and copy. Do not add
features. If a bug in the engine appears, follow diagnosing-bugs.

Deliver a launch checklist in docs/launch.md with the preview URL,
test accounts (not real passwords in git), and remaining risks.
```

---

## 7. Cross-cutting rules for all implementation agents

1. **Read this file and `DESIGN.md` / `PRODUCT.md` before coding.**  
2. **TypeScript strict.** No `any` except at a documented boundary.  
3. **Engine code stays pure** and unit-tested.  
4. **No GitHub Pages static export** unless a new ADR replaces Path B.  
5. **No secrets in git.**  
6. **No medical guarantees** in UI copy.  
7. **Do not scrape by default.**  
8. **Aceternity + Impeccable + Refero + UX Pro Max** on every new screen.  
9. **After develop, commit with a clear message, then run the phase review.**  
10. If blocked on a §3 question, write a questionnaire — do not guess body-comp clinical policy.

---

## 8. Suggested first three prompts (owner → agents)

Use these in order after merging this plan.

**Prompt A — Phase 0**  
Paste the Phase 0 prompt in §6.

**Prompt B — Phase 1**  
Paste the Phase 1 prompt once Phase 0 is gated.

**Prompt C — Phases 3–5** (only after DESIGN.md and engine-spec exist)  
Ask one implementation agent to do Phase 3, a second to do Phase 4 when env keys exist, a third to TDD Phase 5. Do not combine 3–8 in a single unattended run.

---

## 9. Out of scope for v1

- Native App Store apps  
- Wearables, Apple Health, Google Fit  
- Photo DEXA-from-selfie or “AI body scan”  
- Grocery delivery  
- Social feeds / leaderboards  
- Coaching marketplace  
- Live web scraping of commercial recipe sites  
- GitHub Pages as the authenticated app host  

---

## 10. What to expect after this plan is followed

You will not get a finished diet app from this document alone. You will get a **phased build** where:

- Look and feel are decided with real design-research skills before components are copied from Aceternity.  
- The maths for calories, macros, and timelines is written down and tested so two people with the same stats get a defensible plan.  
- Login and saved data live on a real host with a real database, which GitHub Pages cannot provide.  
- Meals and workouts can be opened, swapped, and regenerated without destroying last week’s plan.  
- Recipe growth, if you want it later, is a reviewed catalog pipeline — not a scraper bolted onto the website.

In everyday terms: **the phone app asks for your stats, builds a week of food and training aimed at the body-comp goal you chose, and remembers it the next time you log in** — provided you accept Netlify/Vercel + Supabase instead of github.io for the real product.
