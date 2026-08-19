# Initial Plan — Body composition diet & exercise planner

**Document:** `InitialPlan180826.md`  
**Date:** 18 August 2026  
**Revision:** 4 — USDA write-time nutrition for `data/recipes.json` (18 Aug 2026)  
**Status:** Phase 2 **complete** pending owner spot-check of fixtures (19 Aug 2026). Independent second-agent recompute **matched** the male/female/unsafe literals. Phase 1 complete (contrast caveat fixed). Phase 0 brief remains in force. §3 remains **closed**. No Next.js scaffold yet. Recipe macros must be USDA-checked when the catalog is written, never via a live call from GitHub Pages.  
**Product name:** BodyPlan  
**Audience:** Implementation agents and the product owner  
**Stack (v1):** Next.js (static export) · TypeScript · React · Tailwind CSS · Aceternity UI · Supabase JS client · Supabase Postgres  
**Deferred:** NextAuth.js, Prisma-at-runtime, multi-user login  
**Host (v1):** GitHub Pages (`*.github.io`) talking **directly** to Supabase from the browser

This document is the source of truth until a later plan supersedes it. Every implementation phase must **design → develop → review**, then stop at the listed gate. Do not start a later phase until its gate is green, or until the owner explicitly waives a question in writing.

**Revision 2:** Auth is a **low-priority, later-stage** feature. v1 is a **single-user personal tool**. The architecture must still be **auth-ready** so a login wall can be added after the owner has used the app, without rewriting the engine, UI, or schema.

**Revision 3:** Owner answers to §3 are frozen in §3. Phase 0 must turn them into `PRODUCT.md` / ADRs, not open a new grilling session on the same list.

**Revision 4:** Every recipe in `data/recipes.json` must have macros **computed from USDA FoodData Central at write/CI time**. The Pages app only reads the committed JSON. No live USDA calls in the browser.

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

## 3. Frozen v1 decisions (owner answers, 18 Aug 2026)

These are **closed**. Implementation agents and the Phase 0 agent must not re-ask them or invent extras that conflict. Katie’s Adventures is the **repo / chapter container**. The **product name in the app is BodyPlan**.

**Already decided in revision 2 (still true)**

- Audience: **single user**, not a public product.  
- Host: **GitHub Pages + Supabase**.  
- Auth: **deferred**. Design auth-ready; do not implement a login wall in v1.  
- When auth is added: **Supabase Auth**, not NextAuth.

### Product and people

| # | Question | Frozen answer |
| --- | --- | --- |
| 1 | Product name and voice? Personal tool vs Katie’s Adventures branding? | **BodyPlan.** Personal planner. Do not brand the in-app UI as “Katie’s Adventures”; that name stays on the repo. |
| 2 | Adults only? | **18+** (intended audience and copy). Not a child product. |
| 3 | Sex / gender for Mifflin–St Jeor? | **Male or female** only in v1. No prefer-not-to-say. |
| 4 | Units? | **Metric only** (cm, kg). No imperial toggle in v1. |
| 5 | Body composition source? | **InBody / Tanita** (BodyID-class machine). Profile and check-ins are built around machine readouts, not tape estimates or photos. |
| 6 | Primary goal mix? | **User chooses** one of: fat loss, fat loss + retain muscle, recomp, maintain. |

### Nutrition and training

| # | Question | Frozen answer |
| --- | --- | --- |
| 7 | Dietary constraints? | **User select** at onboarding (vegetarian, vegan, allergies, cooking time, servings, and similar flags). Catalog must support the filters offered. |
| 8 | Kitchen reality? | **User select** (batch-cook, leftovers as lunch, eating-out days, etc.). |
| 9 | Training setting? Days per week? | **Gym** equipment track only in v1. **User selects days per week.** Do not build home / bands / bodyweight tracks unless the owner reopens this. |
| 10 | Cardio? | **Not a separate onboarding preference.** Cardio is **whatever the workout generator suggests** for the chosen goal and gym days. |
| 11 | Timeline rules? | **User selects** the target date / duration. Engine **blocks unsafe speeds** (see §5.3). User may go slower than the cap, not faster. |
| 12 | Recipe source for v1? | **Owned JSON in the repo** (`data/recipes.json`). No scraping in v1. **Macros must be USDA FoodData Central–computed when the file is written** (§4.2). Not a live API from the website. |
| 13 | Exercise source for v1? | **Owned JSON in the repo** (`data/exercises.json`). Same as recipes. |

### Legal, content, later auth

| # | Question | Frozen answer |
| --- | --- | --- |
| 14 | Medical disclaimer / hard-stops? | **Disclaimer yes. Hard-stops no** (no block for pregnancy, eating-disorder history, BMI floor, or age in the generator). Still **block unsafe loss speed**. Copy must not claim medical treatment. Intended users are 18+. |
| 15 | Swap meals and lifts? | **Swaps allowed.** |
| 16 | Progress data? Photos? | **No photos.** Progress is **weight + InBody/Tanita / BodyID machine** fields (same family as onboarding). |
| 17 | GitHub Pages type? | **Project site** (default): `username.github.io/Katies-Adventures-2_Chapter-2` with Next.js **`basePath`**. |
| 18 | Optional lock after testing? | **Yes, later:** email **magic link** is enough unless the owner changes it. No Google OAuth in the first lock. |
| 19 | Who does later login protect against? | **Random visitors to a public repo’s Pages site.** A determined person using an old JS bundle with an old anon policy is **further planning** (cache + policy version / key rotation). |

---

## 4. How to access and update recipes and exercise plans

### 4.1 v1: git-owned catalog + Supabase personal plans

**Catalog (read-mostly):** `data/recipes.json` and `data/exercises.json` shipped with the static site. Update by PR. No anon write access, so a stranger cannot poison the food library.

**Recipe macros are not LLM guesses.** An agent may draft titles, steps, and ingredient *lists*, but kcal / protein / carbs / fat are filled by the USDA write-time pipeline in §4.2 before the file is mergeable.

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

### 4.2 USDA write-time nutrition (**required**, not a live app call)

The website on GitHub Pages **never** calls USDA. Nutrition is baked into `data/recipes.json` when recipes are authored or CI runs.

**Pipeline (every new or edited recipe)**

1. Author (human or agent) writes **ingredients with grams** (and optional household measure for the UI).  
2. Each ingredient is mapped to a USDA FoodData Central food (`fdcId`). Prefer Foundation / SR Legacy generic foods over random branded hits, unless the recipe truly uses that brand. Record a short `matchNote` if the match is approximate (e.g. “plain low-fat yogurt”).  
3. A **local or CI script** (`tools/nutrition/` — name locked in Phase 6) calls the FDC API **once per missing cache entry**, using `USDA_FDC_API_KEY` from `.env` / GitHub Actions secrets. **Not** `NEXT_PUBLIC_`.  
4. The script sums nutrients for the recipe, writes `kcal`, `proteinG`, `carbG`, `fatG`, and a 4-4-9 checksum flag.  
5. Lookups are saved in a committed cache (e.g. `data/nutrition/fdc-cache.json`) so later CI can **re-check maths without hitting USDA** if cache hits. Cache misses (new `fdcId`) may call USDA in CI.  
6. PR / `npm run nutrition:check` **fails** if any recipe is missing `fdcId`s, has `nutrition.source` other than `usda-fdc`, fails checksum beyond a small rounding tolerance, or still has placeholder macros (`0`/`TODO`/LLM-only).

**Required JSON shape (conceptual)**

```json
{
  "slug": "greek-yogurt-berry-bowl",
  "ingredients": [
    { "name": "Greek yogurt, plain, nonfat", "grams": 200, "fdcId": 170903, "matchNote": "FDC nonfat Greek yogurt" }
  ],
  "nutrition": {
    "kcal": 146,
    "proteinG": 20.4,
    "carbG": 8.1,
    "fatG": 0.8,
    "source": "usda-fdc",
    "computedAt": "2026-08-18T00:00:00Z",
    "checksumOk": true
  }
}
```

**Rules for agents**

- Do not commit `data/recipes.json` until `nutrition:check` passes.  
- Do not copy commercial recipe-site nutrition labels and pretend they are USDA.  
- If FDC has no honest match, **do not invent macros** — pick the closest generic food and `matchNote`, or drop the recipe.  
- The Next.js bundle must not import the USDA client.  
- Exercises are **not** USDA-checked (movement catalog, not food).

**Owner setup:** one free [FoodData Central API key](https://fdc.nal.usda.gov/api-guide) in GitHub Actions (and local `.env`). Demo keys are too fragile for CI.

### 4.3 Other licensed ingest (Phase 9, optional)

Still laptop/CI only, never on page view. Spoonacular/Edamam may grow *ideas* for recipes; **macros still go through §4.2 USDA** before they land in `data/recipes.json`. wger.de is for exercises, not food.

### 4.4 ScrapeGraphAI (Phase 9, gated)

Local ingest only. Follow `.agents/skills/scrapegraph-content-ingest/SKILL.md`. No commercial recipe-site scraping. Output is a **draft ingredient list** → then **§4.2 USDA enrich** → PR into `data/`.

### 4.5 Owner update loop

**v1:** draft recipe → USDA enrich script → PR. GitHub Actions runs `nutrition:check` then deploys Pages.  
**v1.5:** optional Supabase catalog tables + a crude edit form **behind the later auth lock** (do not ship a public write UI while anon can write). New rows still need USDA enrich before they are trusted.  
**v2:** out of scope.

---

## 5. Product surfaces and domain

### 5.1 App surfaces (mobile web)

| Route | Purpose |
| --- | --- |
| `/` | Today if a plan exists, else start onboarding. Not a marketing SaaS landing. |
| `/onboarding` | Sex (M/F), age, height (cm), InBody/Tanita fields, goal type, timeline, diet flags, kitchen flags, gym days/week |
| `/plan` | Current plan home (today + week) |
| `/plan/meals` | Meal calendar + swap |
| `/plan/workouts` | Training calendar + swap |
| `/plan/timeline` | Goal date, projected vs actual, check-ins |
| `/log` | Weigh-in and adherence |
| `/recipes/[slug]` | Recipe detail |
| `/exercises/[slug]` | Exercise detail |
| `/settings` | Profile (metric), regenerate; **later:** “Lock with email” |
| `/lock` | **Not in v1.** Phase 4b only. |

Bottom nav: Today · Plan · Log · You. Impeccable **product** lane. Aceternity is seasoning (bento, motion on one or two surfaces), not every card.

### 5.2 Domain model (auth-ready)

Working vocabulary for `CONTEXT.md`. Tables, not Prisma models, unless someone uses Prisma **only** on a laptop to emit SQL.

- `profiles` — `owner_id unique`, `sex` (`male` \| `female`), `birth_date`, `height_cm`, InBody/Tanita snapshot (`weight_kg`, `body_fat_pct`, `skeletal_muscle_mass_kg`, optional visceral fat / other machine fields Phase 2 names), `diet_flags`, `kitchen_flags`, `gym_days_per_week`  
- `goals` — `owner_id`, `type` (`fat_loss` \| `fat_loss_retain_muscle` \| `recomp` \| `maintain`), targets, `start_on`, `end_on`, `weekly_loss_cap_pct`  
- `plans` / `plan_versions` — calorie target, macros, split, generator input snapshot  
- `day_plans`, `meal_slots`, `workout_sessions`, `workout_items`  
- `check_ins` — date, InBody/Tanita / BodyID snapshot (weight, body fat %, skeletal muscle mass, optional extras); **no photos**  
- `favorites`  
- Catalog files (or tables without `owner_id`): `Recipe` (ingredients + `fdcId` + `nutrition.source: usda-fdc`), `Exercise` (no USDA)

v1 inserts always set `owner_id = DEFAULT_OWNER_ID`. Do not add NextAuth `Account` / `Session` tables.

### 5.3 Planning engine (unit-test in Phase 5)

Pure TypeScript `src/engine/` — no React, no Supabase.

1. **BMR** — Mifflin–St Jeor: male `10w + 6.25h − 5a + 5`, female `10w + 6.25h − 5a − 161` (kg, cm, years). Sex is male or female only.  
2. **TDEE** — BMR × activity. Gym days/week may inform activity; Phase 2 picks the exact factor. Prefer InBody/Tanita weight and body-fat % over estimates.  
3. **Rate** — default 0.5% body weight / week; **cap 1.0%** (unsafe speeds blocked even though other medical hard-stops are off). User may choose a slower timeline.  
4. **Timeline** — user-selected end date. If implied weekly loss exceeds the cap, **refuse that date** and offer the fastest safe date. Do not refuse for age, BMI, pregnancy, or ED history (owner: no hard-stop).  
5. **Macros** — protein 1.6–2.2 g/kg (Phase 2 decides actual vs goal weight, informed by skeletal muscle mass when present); fat ≥ 0.7 g/kg; carbs fill the rest. Shift protein/carb emphasis by goal type (`fat_loss`, `fat_loss_retain_muscle`, `recomp`, `maintain`).  
6. **Meals** — knapsack over slot-tagged recipes using **user-selected** diet and kitchen flags.  
7. **Training** — **gym** movements only. Session count from **user-selected days/week**. Cardio (Zone 2 / intervals / none) is **chosen by the generator** for the goal, not a separate preference. Deload every 4th week. Same movement menu for male and female.

**Disclaimer on generate.** No medical-treatment claims. Intended for adults 18+. The only generator **block** in v1 is **unsafe loss speed**. Calorie floors may still be used as *targets* in Phase 2 spec, but they are not a “see a doctor before continue” gate unless Phase 2 documents them as a warning, not a hard-stop.

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

## Phase 0 — Write the brief from frozen §3 answers

**Status:** Complete (18 Aug 2026).

**Goal:** Turn **already-frozen** §3 answers plus auth-ready rules into `PRODUCT.md`, `CONTEXT.md`, and ADRs. Do **not** re-interview §3.

### Design

- Read §3 as the product spec.  
- `PRODUCT.md`: BodyPlan, personal 18+ gym planner, InBody/Tanita, user-selected diet/kitchen/days/goals, metric, swaps, no photos, no login in v1.  
- `CONTEXT.md` glossary: BodyPlan, BodyID/InBody/Tanita, `owner_id`, `DEFAULT_OWNER_ID`, Data gateway, goal types.  
- ADRs: hosting (project Pages + `basePath`) and deferred magic-link lock.

### Develop

- Docs only: `docs/decisions/0001-v1-scope.md`, `docs/decisions/0002-auth-ready-static.md`.  
- Optional: `docs/domain/inbody-fields.md` and `docs/domain/recipe-nutrition.md` (USDA write-time contract from §4.2 — do not treat USDA as a runtime dependency).

### Review

- Docs match §3 tables exactly (gym only, metric only, no medical hard-stops except unsafe speed, magic link later).  
- No medical-guarantee copy.

### Gate

- [x] `PRODUCT.md` and `CONTEXT.md` exist and quote §3  
- [x] ADRs 0001 and 0002 exist  
- [x] No new onboarding fields that contradict §3 (no imperial, no home gym track, no photos)  

**Completed (18 Aug 2026):** `PRODUCT.md`, `CONTEXT.md`, `docs/decisions/0001-v1-scope.md`, `docs/decisions/0002-auth-ready-static.md`, `docs/domain/inbody-fields.md`, `docs/domain/recipe-nutrition.md`. Next: Phase 1 (DESIGN.md). Do not re-interview §3.

**Further planning if:** public multi-user product, clinical dietetics, or extra InBody segmental charts.

### Implementation-agent prompt

```text
You are the Phase 0 planning agent. Read InitialPlan180826.md revision 4
end to end, especially frozen §3 and §4.2 USDA write-time nutrition. Load domain-modeling and
writing-for-agents. Do NOT run grill-me / grill-with-docs on §3 — those
questions are answered.

Do not write application code. Do not scaffold Next.js.

v1 is decided: BodyPlan; GitHub Pages project site + basePath + Supabase
JS; single user; no login wall; auth-ready owner_id + data gateway;
metric; male/female; InBody/Tanita (BodyID) fields; gym; user-select
diet, kitchen, days/week, goal type, timeline (unsafe speeds blocked);
owned JSON catalog with USDA write-time macros (§4.2); swaps on; no photos; no medical hard-stops except
unsafe loss speed; later lock = magic link.

Tasks:
1. Write PRODUCT.md, CONTEXT.md (glossary), docs/decisions/0001-v1-scope.md,
   docs/decisions/0002-auth-ready-static.md (Phase 4b remap
   DEFAULT_OWNER_ID → auth.uid(), magic link only).
2. Optionally list v1 InBody/Tanita fields in docs/domain/inbody-fields.md
   and restate the USDA write-time recipe contract in
   docs/domain/recipe-nutrition.md (no live USDA in the app).
3. Stop at the Phase 0 gate. Docs-only PR.

Do not reopen NextAuth, Netlify, imperial units, or home-gym tracks.
Review: docs must not contradict §3.
```

---

## Phase 1 — UX research and design system

**Status:** Complete (19 Aug 2026). Owner assured proceed to Phase 2 with one caveat (helper-copy contrast). Caveat addressed: `iron-2` `#2c2c2c` → `#1a1a1a` in `DESIGN.md` and the prototype CSS. Screenshots were **not** regenerated.

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

- [x] `DESIGN.md` + `PRODUCT.md`  
- [x] Reference lock listed  
- [x] Five core screens prototyped  
- [x] Owner thumbs-up or written proceed (19 Aug 2026; contrast caveat then fixed)

**Completed (18 Aug 2026):** `DESIGN.md` (bumper-plate load, seed `c3180cb2`), `docs/ux/flows.md`, `docs/ux/component-inventory.md`, `docs/ux/critique-notes.md`, clickable HTML at `docs/ux/prototype/index.html` (onboarding, today, swap, session, timeline). See `docs/ux/prototype/README.md` for how to open it.

**Caveat fix (19 Aug 2026):** helper copy (including “InBody / Tanita (BodyID). Type the printout. No photos.”) uses **iron-2** `#1a1a1a` instead of `#2c2c2c`. Next: Phase 2. No Supabase apply.

**Further planning if:** native iOS/Android.

### Implementation-agent prompt

```text
You are the Phase 1 design agent. Read InitialPlan180826.md revision 4
(frozen §3), PRODUCT.md, Phase 0 ADRs. Load refero-design, ui-ux-pro-max,
impeccable, prototype.

Research before pixels. Product lane. Mobile-first BodyPlan for one gym
user. Metric. InBody/Tanita onboarding. User-select diet/kitchen/days/goal.
No login, no photos, no imperial, no home-gym track. Aceternity is seasoning.

Deliver DESIGN.md, docs/ux/flows.md, component inventory, clickable
prototype (onboarding, today, swap). Critique notes.

Do not add a sign-up flow. Settings may show a disabled “Lock this data
later” note in copy only if it does not look like a broken button.

Gate: owner review of DESIGN.md. No Supabase yet.
```

---

## Phase 2 — Domain model and engine spec

**Status:** Spec complete (19 Aug 2026). Independent recompute matched. Remaining: owner spot-check.

**Goal:** Testable maths + auth-ready ERD.

### Design

- ERD with `owner_id` on every personal table.  
- Missing InBody fields, protein rule, calorie *warnings*, leftover/kitchen flags.  
- Engine I/O types. Engine does not mention owner.

### Develop

- `docs/domain/erd.md`, `docs/domain/engine-spec.md` (male + female worked examples), `docs/domain/content-model.md`.  
- Draft `supabase/migrations/0001_init.sql` (proposal; apply in Phase 4).  
- Draft `src/data/owner.ts` contract in the spec (constant UUID).

### Review

- Independent recalculation of fixtures.  
- Confirm no singleton table without `owner_id`.

### Gate

- [x] ERD has owner_id everywhere personal  
- [x] Loss-speed cap matches §3 (block unsafe; no other medical hard-stops)  
- [x] Worked examples match (second agent recompute, 19 Aug 2026; owner may still spot-check)

**Completed (19 Aug 2026):** `docs/domain/erd.md`, `docs/domain/engine-spec.md` (male + female worked examples; gym days user-selected; InBody fat % present), `docs/domain/content-model.md`, `docs/domain/fixtures/engine-examples.json`, proposed `supabase/migrations/0001_init.sql` (not applied), `supabase/policies.sql`, `CONTEXT.md` glossary updates. `DEFAULT_OWNER_ID` = `198e5a49-c748-4bcc-b6ad-86445a76eb7b`. Independent agent recomputed both examples and the unsafe-date block; literals matched. No React. No NextAuth tables. Next: Phase 3 scaffold after owner spot-check.  

### Implementation-agent prompt

```text
You are the Phase 2 domain agent. Read InitialPlan180826.md §2.2 and §5.
Load domain-modeling, to-spec, tdd (spec/fixtures only).

Deliver:
1. docs/domain/erd.md — owner_id on personal tables; unique(owner_id) on
   profiles; catalog without owner_id
2. docs/domain/engine-spec.md with two worked examples (male + female,
   gym days user-selected, InBody fat % present)
3. docs/domain/content-model.md (diet/kitchen user-select tags; recipe
   JSON with ingredients.grams, fdcId, nutrition.source usda-fdc per §4.2)
4. Proposed supabase/migrations/0001_init.sql plus comments for v1 RLS
   vs Phase 4b RLS (do not apply without credentials)
5. CONTEXT.md updates

Honour §3: metric; gym only; four goal types; no photos; unsafe speed
is the only generator block.
No React. No NextAuth tables. Gate if any formula is underspecified.
A second agent must recompute the worked examples.
```

---

## Phase 3 — Next.js static scaffold for GitHub Pages

**Goal:** Typed Next.js app that **static-exports** and deploys to GitHub Pages.

### Design

- App Router, `src/`, fonts from `DESIGN.md`.  
- `components.json` with `@aceternity`.  
- `next.config`: `output: 'export'`, `trailingSlash: true`, `images.unoptimized: true`, **`basePath` for the project Pages site** (`/Katies-Adventures-2_Chapter-2` unless a custom domain ADR says otherwise).  
- `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the app. `USDA_FDC_API_KEY` for **tools/CI only** — never `NEXT_PUBLIC_`. No `service_role`, no `AUTH_SECRET`, no `DATABASE_URL` in the web env.

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
- [ ] `.env.example` documents public Supabase keys and a **non-public** `USDA_FDC_API_KEY` (tools/CI only)  

**Further planning if:** you need SSR after all — then Netlify/Vercel is a new ADR, not a silent switch.

### Implementation-agent prompt

```text
You are the Phase 3 scaffold agent. Read InitialPlan180826.md revision 4
and DESIGN.md. Load impeccable (shell only), ui-ux-pro-max.

Scaffold Next.js App Router + TypeScript + Tailwind in the repo root.
MUST set output:'export', unoptimized images, trailingSlash, and basePath
for the GitHub **project** site (Katies-Adventures-2_Chapter-2).

Wire shadcn + Aceternity registry. Apply DESIGN.md tokens. Placeholder
routes: /, /onboarding, /plan, /settings. No /login.

GitHub Action deploys out/ to GitHub Pages. Add .nojekyll.

Do not implement Prisma, NextAuth, or Server Actions (they break export).
Do not put service_role or USDA_FDC_API_KEY in any NEXT_PUBLIC_ variable.
Document USDA_FDC_API_KEY in .env.example as tools/CI-only (Phase 6 wires the script).

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

- 4–5 short steps, no “create account.” Collect InBody/Tanita numbers, goal type, diet/kitchen flags, gym days/week, user-selected timeline. Preview kcal / protein / weeks before commit.  
- Copy when the chosen date is faster than the loss cap (offer the fastest safe date). No other medical blocks.

### Develop

- TDD `src/engine`. Persist via `src/data`.  
- Male and female fixtures; floors; loss cap.

### Review

- Fixtures match spec. Onboarding on 375px. Disclaimer on review step.

### Gate

- [ ] Engine tests green  
- [ ] PlanVersion persisted for `DEFAULT_OWNER_ID`  
- [ ] Unsafe **loss speed** blocked; other medical hard-stops **not** implemented  
- [ ] `/impeccable critique` on onboarding  

### Implementation-agent prompt

```text
You are the Phase 5 engine agent. Read engine-spec.md and §5.3. Load tdd,
implement, impeccable, ui-ux-pro-max.

Pure engine first, then onboarding (InBody/Tanita, metric, M/F, gym
days, user diet/kitchen/goal/timeline). Persist through src/data only
(owner_id from getOwnerId()). No login. Dummy meal titles OK.
Block unsafe loss speed only — no BMI/age/pregnancy hard-stops.

Review: code-review + independent fixture check.
```

---

## Phase 6 — Recipes, USDA enrich, and meal plan UI

**Goal:** Breakfast, lunch, dinner, snacks hit **USDA-computed** macros; swaps work.

### Design

- MealCard, day strip, SwapSheet. Empty state if filters match nothing.  
- Recipe JSON + cache layout per §4.2.

### Develop

- `tools/nutrition/` enrich + `npm run nutrition:check`.  
- Committed `data/nutrition/fdc-cache.json`.  
- Seed `data/recipes.json` **only after** enrich (no LLM-only macros).  
- `src/engine/meals.ts` TDD. Pins/swaps in Supabase.  
- Vegetarian never returns meat.  
- GitHub Action: `nutrition:check` on PRs that touch `data/recipes.json` or the cache. Use repo secret `USDA_FDC_API_KEY` only on cache miss.

### Review

- Every seed recipe has `nutrition.source: usda-fdc` and `checksumOk`.  
- Confirm the Next.js client bundle has no USDA URL/key.  
- 375px sheet. `/impeccable polish`.

### Gate

- [ ] Seed size agreed  
- [ ] `nutrition:check` green  
- [ ] Assigner tests green  
- [ ] Swap + pin  
- [ ] Owner can cook 3 sample days  
- [ ] No live USDA from Pages  

### Implementation-agent prompt

```text
You are the Phase 6 meals agent. Read InitialPlan180826.md §4.2,
content-model.md, and DESIGN.md. Load tdd, refero-design, impeccable,
ui-ux-pro-max.

Build tools/nutrition to map ingredient grams → USDA FDC fdcId → summed
macros, with a committed fdc-cache. Wire npm run nutrition:check.

Draft recipes if you want, but you MUST run enrich before committing
data/recipes.json. Reject LLM-guessed kcal/protein. Do not call USDA
from the Next.js app.

Then: assigner + mobile meal UI with swap/pin. Personal rows via
src/data (owner_id). No ScrapeGraphAI unless Phase 9 is open.
No public recipe write API.

If USDA_FDC_API_KEY is missing, write a wizard for the data.gov FDC key
and stop before claiming the catalog is done.
```

---

## Phase 7 — Exercise catalog and workout UI

**Goal:** Weekly sessions from equipment + days; swap/complete/skip.

### Design

- One-exercise-at-a-time on mobile. Deload copy. Timer optional (skip if it delays the gate).

### Develop

- `data/exercises.json`. `src/engine/training.ts`. Persist completions.

### Review

- Gym-only catalog. Critique cognitive load. Cardio sessions appear as the generator suggests.

### Gate

- [ ] Training tests green  
- [ ] Complete/skip persisted  
- [ ] Volume from engine rules, not a gendered UI  

### Implementation-agent prompt

```text
You are the Phase 7 training agent. Read engine-spec training section and
DESIGN.md. Load tdd, refero-design, impeccable.

JSON exercise catalog (gym only), split generator from user-selected
days/week, session UI. Cardio is generator-chosen. Persist through
src/data. Text cues only.
```

---

## Phase 8 — Timelines, check-ins, plan access and updates

**Goal:** Reopen, follow, regenerate without destroying history.

### Design

- Timeline rail, weekly InBody/Tanita / BodyID check-in (no photos), regenerate confirmation (pins kept).

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

## Phase 9 — Content pipeline (optional growth)

**Goal:** Grow the JSON catalog legally. Skip if the USDA-checked seed is enough.

Laptop ingest → **§4.2 USDA enrich** → PR into `data/`. ScrapeGraphAI only for signed-off sources, and only as a draft ingredient list. Never on the request path. Never overwrite reviewed items blindly. Never skip USDA because “the other API already had calories.”

### Implementation-agent prompt

```text
You are the Phase 9 ingest agent. Read scrapegraph-content-ingest SKILL
and §4.2–4.4. Drafts must run through tools/nutrition (USDA) before
merge. Do not stub USDA — the enricher already exists from Phase 6.
wger is exercises only. Never import scrapegraphai or USDA into the
Next.js client. JSON PRs only.
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
11. **§3 is frozen.** Do not re-open those questions. If something is still ambiguous (e.g. exact InBody field list), document a Phase 2 assumption that does **not** contradict §3.  
12. **Recipe macros = USDA write-time (§4.2).** No live USDA in the Pages app. No merge of `data/recipes.json` without `nutrition:check`.

---

## 8. Suggested first prompts (owner → agents)

**A.** Phase 0 — **done.** Brief is `PRODUCT.md` / ADRs from frozen §3. Do not re-interview.  
**B.** Phase 1 — **prototype done.** Owner reviews `DESIGN.md`; screens are `docs/ux/prototype/index.html`.  
**C.** Phase 3 then Phase 4 (scaffold export, then gateway). Phase 5 only after engine-spec exists.  
**D.** Phase 4b **only after** the owner has lived with the app and asks to lock it.

---

## 9. Out of scope for v1

- NextAuth.js / Auth.js  
- Prisma in the running website  
- Login, sign-up, OAuth, passwords  
- Native apps, wearables, progress photos, AI body-scan  
- Imperial units, home / bands / bodyweight training tracks  
- Grocery delivery, social, coaching marketplace  
- Commercial recipe scraping  
- Public multi-user SaaS  

---

## 10. What to expect (plain language)

BodyPlan is a personal 18+ gym planner. You type InBody/Tanita (BodyID) numbers, pick a goal, diet, kitchen style, gym days, and a timeline. It builds meals from a recipe list in the repo whose **calories and macros were checked against USDA when that list was written** (not when you open the app) and a gym workout (including any cardio the plan thinks you need). You can swap meals and lifts. It will not let you pick a dangerously fast weight-loss date. It will not block you for BMI or age. There are no photos. The site can live on GitHub Pages and remember your data in Supabase. Login can wait; when you want it, a magic link is enough.

Phase 0 wrote the brief. Phase 1 has a clickable phone prototype in `docs/ux/prototype/index.html` (open that file in a browser). `DESIGN.md` is waiting on owner review before Phase 2. Later agents should not ask the §3 questions again.
