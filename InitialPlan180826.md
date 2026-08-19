# Initial Plan — Body composition diet & exercise planner

**Document:** `InitialPlan180826.md`  
**Date:** 18 August 2026  
**Revision:** 5 — mixed training week + auth at persistence (19 Aug 2026)  
**Status:** Phase 6 **pipeline + meal UI** (19 Aug 2026); **catalog not done** (FDC key missing). Phase 5 engine + onboarding shipped. Phase 4 live gates are green. Phase 3 scaffold merged. Owner reopened **Q9** (several settings in the same week) and **auth** (Phase 4b is no longer optional). Phase 1 UX and Phase 2 domain are **amended** in this revision; do not re-scaffold Phase 3. §3 remains **closed** except as amended in revision 5. Recipe macros must be USDA-checked when the catalog is written, never via a live call from GitHub Pages.  
**Product name:** BodyPlan  
**Audience:** Implementation agents and the product owner  
**Stack (v1):** Next.js (static export) · TypeScript · React · Tailwind CSS · Aceternity UI · Supabase JS client · Supabase Postgres · Supabase Auth (magic link)  
**Deferred:** NextAuth.js, Prisma-at-runtime, Google OAuth, passwords-as-product, public multi-user SaaS  
**Host (v1):** GitHub Pages (`*.github.io`) talking **directly** to Supabase from the browser

This document is the source of truth until a later plan supersedes it. Every implementation phase must **design → develop → review**, then stop at the listed gate. Do not start a later phase until its gate is green, or until the owner explicitly waives a question in writing.

**Revision 2 (struck by revision 5 on auth):** Auth was a later-stage bolt-on with no login wall in v1. **Superseded:** email magic-link auth ships **with** Phase 4 persistence. See `docs/decisions/0004-auth-at-persistence.md`.

**Revision 3:** Owner answers to §3 are frozen in §3. Phase 0 must turn them into `PRODUCT.md` / ADRs, not open a new grilling session on the same list.

**Revision 4:** Every recipe in `data/recipes.json` must have macros **computed from USDA FoodData Central at write/CI time**. The Pages app only reads the committed JSON. No live USDA calls in the browser.

**Revision 5:** Training is a **mixed week**: each weekday is rest or one of gym / home / bands / bodyweight (example: gym Tuesday, bands Thursday). PAL and split still follow the **count** of train days. Auth is **not optional**: Phase 4 and the old Phase 4b run **together**. `DEFAULT_OWNER_ID` is test/fixture only. RLS is `owner_id = auth.uid()` from the first applied migration.

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
- Email **magic-link** sign-in (**Supabase Auth**, not NextAuth), because Auth.js on Pages has no API routes to land OAuth callbacks on a first-party server — Supabase Auth is built for static sites

What does **not** work on GitHub Pages:

- NextAuth.js / Auth.js with a Prisma adapter  
- Prisma Client inside the website (Prisma is Node-only; it may be used **on a laptop** to push schema if you insist, but the running app must use `supabase-js`)  
- Hiding secrets in the JavaScript bundle — the **anon key is public by design**

### 1.1 Is a database required for a single user?

**Yes, if you want the plan to survive a new phone, a cleared cache, or a new deploy.** `localStorage` is a fine cache, not the source of truth.

For one person, Supabase is still the right store: one project, one set of tables, almost no operational cost on the free tier. You are not paying for “multi-user SaaS.” You are paying for **memory that is not stuck in one browser**.

### 1.2 Honest security note (single user, magic-link lock)

The GitHub Pages URL plus the public anon key is enough for **anyone who finds the site** to read and write the same tables, unless Row Level Security (RLS) is locked to a signed-in user.

Body-comp data is sensitive. Revision 5 therefore **does not** ship an open single-owner anon policy. The plan:

1. Puts `owner_id` on every personal row from day one.  
2. Keeps **all** database calls behind one module.  
3. Ships **Supabase Auth email magic link with Phase 4 persistence**. RLS is `owner_id = auth.uid()` for `authenticated`; **revoke** `anon` on personal tables.  
4. Never applies the old `DEFAULT_OWNER_ID` open policy, then “fixes it in 4b.”

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

**Phase 4:** same diagram, plus `supabase.auth` session (email magic link). RLS is `owner_id = auth.uid()` for `authenticated`. `/lock` (or Settings magic-link) is in v1. Engine and meal cards stay owner-agnostic.

### 2.1 Why not NextAuth + Prisma on this host

| Original idea | v1 decision | Why |
| --- | --- | --- |
| NextAuth.js | **Out of v1. If auth is added, use Supabase Auth.** | NextAuth wants server callbacks. Supabase Auth works from static JS. |
| Prisma in the web app | **Out of the running app.** Optional laptop-only migrations. | Prisma does not run in the browser. |
| Netlify/Vercel | **Not required for v1.** Keep as an escape hatch if you later want server features. | Pages + Supabase is enough for a personal planner. |
| One Profile row with no owner | **Forbidden.** Use `owner_id` even for one person. | Otherwise adding auth means a schema rewrite. |

### 2.2 Auth-at-persistence rules (non-negotiable from Phase 4 onward)

These exist so persistence is **never** shipped with an open single-owner policy. ADR: `docs/decisions/0004-auth-at-persistence.md` (supersedes 0002).

1. **Single data gateway.** Only `src/data/*` may import `supabase-js`. Pages, components, and the engine never call `.from()` themselves.  
2. **`owner_id uuid not null`** on every personal table: `profiles`, `goals`, `plans`, `plan_versions`, `day_plans`, `meal_slots`, `workout_sessions`, `workout_items`, `check_ins`, `favorites`, `training_days`.  
3. **Session owner.** `getOwnerId()` returns `session.user.id` or **throws**. Production writes never use `DEFAULT_OWNER_ID`. That constant in `src/data/owner.ts` is **test/fixture only**.  
4. **One profile per owner.** `unique (owner_id)` on `profiles` — not a table that can only ever have one row in the whole database.  
5. **RLS on from the first applied migration.** `authenticated` only, `owner_id = auth.uid()`. **Revoke** `anon` on personal tables. No `is_v1_owner` open policy. Document it in `supabase/policies.sql`.  
6. **Optional `references auth.users(id)`** when applying SQL in a project with Auth enabled.  
7. **Catalog vs personal data.** Recipes and exercises are **not** personal. Prefer **static JSON in the repo** (`data/recipes.json`, `data/exercises.json`) so the library is versioned in git and does not need write access from the anon key. User swaps and pins are personal rows in Supabase.  
8. **Engine is pure.** `src/engine` has no Supabase, no owner id, no React. Auth cannot infect the maths.  
9. **Session-shaped client.** `createBrowserClient()` is a function that attaches `Authorization: Bearer <jwt>` from the magic-link session.  
10. **`/lock` (or Settings magic-link) is in v1.** Signed-out empty state explains why data is hidden and offers the magic-link CTA. No Google OAuth, no passwords-as-product, no NextAuth.

### 2.3 How Phase 4 adds auth (with the data gateway)

Phase 4 is **one** phase. Do not implement an open `DEFAULT_OWNER_ID` policy and remap later.

1. Enable Email (magic link) in the Supabase project.  
2. Apply migrations with auth-scoped RLS (`owner_id = auth.uid()`; revoke `anon`).  
3. Settings and/or `/lock` send a magic link via `@supabase/supabase-js`. No NextAuth.  
4. `getOwnerId()` reads `session.user.id` and throws if missing.  
5. Prove with an incognito window that signed-out anon cannot read/write personal rows.  
6. No Prisma adapter, no Netlify requirement unless you also want other server features.

**Further planning:** a second person with their own plan is the same RLS with a new `profiles` row. Do not build family-account UI in v1. Google/Apple OAuth is out of v1.

---

## 3. Frozen v1 decisions (owner answers, 18 Aug 2026)

These are **closed**. Implementation agents and the Phase 0 agent must not re-ask them or invent extras that conflict. Katie’s Adventures is the **repo / chapter container**. The **product name in the app is BodyPlan**.

**Already decided in revision 2 (auth line superseded by revision 5)**

- Audience: **single user**, not a public product.  
- Host: **GitHub Pages + Supabase**.  
- Auth: **Supabase Auth email magic link, implemented in Phase 4 with persistence.** Not deferred. Not NextAuth. No Google OAuth in v1.

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
| 9 | Training setting? Days per week? | **Mixed week (revision 5).** Each weekday is rest or one setting: **gym**, **home**, **bands**, **bodyweight**. Example: gym Tuesday, bands Thursday. Not one track for the whole plan. At least one train day. PAL and split follow the **count** of train days, not the kit. |
| 10 | Cardio? | **Not a separate onboarding preference.** Cardio is **whatever the workout generator suggests** for the chosen goal and **train-day count**. |
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
| 18 | Lock? | **In Phase 4, with persistence:** email **magic link**. No Google OAuth. No passwords-as-product. `/lock` (or Settings) is in v1. |
| 19 | Who does login protect against? | **Random visitors to a public repo’s Pages site.** A determined person using an old JS bundle with an old anon policy is **further planning** (cache + policy version / key rotation). |

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
**v1.5:** optional Supabase catalog tables + a crude edit form **behind magic-link auth** (do not ship a public write UI). New rows still need USDA enrich before they are trusted.  
**v2:** out of scope.

---

## 5. Product surfaces and domain

### 5.1 App surfaces (mobile web)

| Route | Purpose |
| --- | --- |
| `/` | Today if a plan exists, else start onboarding. Not a marketing SaaS landing. |
| `/onboarding` | Sex (M/F), age, height (cm), InBody/Tanita fields, goal type, timeline, diet flags, kitchen flags, **7-weekday training map** (rest or gym / home / bands / bodyweight) |
| `/plan` | Current plan home (today + week) |
| `/plan/meals` | Meal calendar + swap |
| `/plan/workouts` | Training calendar + swap |
| `/plan/timeline` | Goal date, projected vs actual, check-ins |
| `/log` | Weigh-in and adherence |
| `/recipes/[slug]` | Recipe detail |
| `/exercises/[slug]` | Exercise detail |
| `/settings` | Profile (metric), regenerate, **magic-link sign-in** |
| `/lock` | **In v1.** Check-email / magic-link callback empty state. |

Bottom nav: Today · Plan · Log · You. Impeccable **product** lane. Aceternity is seasoning (bento, motion on one or two surfaces), not every card.

### 5.2 Domain model (auth-ready)

Working vocabulary for `CONTEXT.md`. Tables, not Prisma models, unless someone uses Prisma **only** on a laptop to emit SQL.

- `profiles` — `owner_id unique`, `sex` (`male` \| `female`), `birth_date`, `height_cm`, InBody/Tanita snapshot (`weight_kg`, `body_fat_pct`, `skeletal_muscle_mass_kg`, optional visceral fat / other machine fields Phase 2 names), `diet_flags`, `kitchen_flags`. **No `gym_days_per_week`.**  
- `training_days` — `owner_id`, `weekday` (`mon`–`sun`), `setting` (`gym` \| `home` \| `bands` \| `bodyweight`); unique `(owner_id, weekday)`; rest days have **no row**; at least one train day  
- `goals` — `owner_id`, `type` (`fat_loss` \| `fat_loss_retain_muscle` \| `recomp` \| `maintain`), targets, `start_on`, `end_on`, `weekly_loss_cap_pct`  
- `plans` / `plan_versions` — calorie target, macros, split, generator input snapshot (includes the week map)  
- `day_plans`, `meal_slots`, `workout_sessions` (each session stores that day’s **setting**), `workout_items`  
- `check_ins` — date, InBody/Tanita / BodyID snapshot (weight, body fat %, skeletal muscle mass, optional extras); **no photos**  
- `favorites`  
- Catalog files (or tables without `owner_id`): `Recipe` (ingredients + `fdcId` + `nutrition.source: usda-fdc`), `Exercise` (`tracks` tagged `gym` / `home` / `bands` / `bodyweight`; no USDA)

Phase 4 inserts set `owner_id` from the signed-in session. `DEFAULT_OWNER_ID` is test/fixture only. Do not add NextAuth `Account` / `Session` tables.

### 5.3 Planning engine (unit-test in Phase 5)

Pure TypeScript `src/engine/` — no React, no Supabase.

1. **BMR** — Mifflin–St Jeor: male `10w + 6.25h − 5a + 5`, female `10w + 6.25h − 5a − 161` (kg, cm, years). Sex is male or female only.  
2. **TDEE** — BMR × activity. **Train-day count** (non-rest weekdays) informs PAL; Phase 2 locks the factor. The day’s **setting** does not change PAL. Prefer InBody/Tanita weight and body-fat % over estimates.  
3. **Rate** — default 0.5% body weight / week; **cap 1.0%** (unsafe speeds blocked even though other medical hard-stops are off). User may choose a slower timeline.  
4. **Timeline** — user-selected end date. If implied weekly loss exceeds the cap, **refuse that date** and offer the fastest safe date. Do not refuse for age, BMI, pregnancy, or ED history (owner: no hard-stop).  
5. **Macros** — protein 1.6–2.2 g/kg (Phase 2 decides actual vs goal weight, informed by skeletal muscle mass when present); fat ≥ 0.7 g/kg; carbs fill the rest. Shift protein/carb emphasis by goal type (`fat_loss`, `fat_loss_retain_muscle`, `recomp`, `maintain`).  
6. **Meals** — knapsack over slot-tagged recipes using **user-selected** diet and kitchen flags.  
7. **Training** — mixed week. Session **count** from non-rest weekdays; each session’s exercises (and swaps) must match **that day’s** setting (`gym` / `home` / `bands` / `bodyweight`). Cardio (Zone 2 / intervals / none) is **chosen by the generator** for the goal, not a separate preference. Deload every 4th week. Same movement rules for male and female.

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

**Amended (19 Aug 2026, revision 5):** onboarding is a 7-weekday setting picker (gym / home / bands / bodyweight / rest). Magic-link copy on You is the intended Phase 4 product, not a disabled fake login. HTML is the source of truth; stills were not regenerated.

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

**Caveat fix (19 Aug 2026):** helper copy (including “InBody / Tanita (BodyID). Type the printout. No photos.”) uses **iron-2** `#1a1a1a` instead of `#2c2c2c`.

**Revision 5 amendment (19 Aug 2026):** mixed-week picker on onboarding step 4; week strip shows each day’s setting; You collects an email for the Phase 4 magic link (`/lock` check-email state). Screenshots were **not** regenerated. Next: Phase 4 (do not re-scaffold Phase 3).

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

**Status:** Spec complete (19 Aug 2026). Independent recompute matched energy literals. Remaining: owner spot-check. **Amended revision 5:** mixed training week + auth-scoped RLS (not applied).

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

**Completed (19 Aug 2026):** `docs/domain/erd.md`, `docs/domain/engine-spec.md` (male + female worked examples; InBody fat % present), `docs/domain/content-model.md`, `docs/domain/fixtures/engine-examples.json`, proposed `supabase/migrations/0001_init.sql` (not applied), `supabase/policies.sql`, `CONTEXT.md` glossary updates. `DEFAULT_OWNER_ID` = `198e5a49-c748-4bcc-b6ad-86445a76eb7b` (**test/fixture only** after revision 5). Independent agent recomputed both examples and the unsafe-date block; energy literals matched. No React. No NextAuth tables.

**Amended (19 Aug 2026, revision 5):** mixed `training_days` week; drop `gym_days_per_week`; PAL still from train-day **count** (kcal fixtures unchanged); RLS proposal is `auth.uid()` (no open v1 owner policy). Next: Phase 4 data gateway **+** magic link (do not apply SQL without credentials).  

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

**Status:** Scaffold complete (19 Aug 2026). Remaining: Pages URL loads after GitHub Pages is pointed at this Action.

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

- [x] lint + typecheck + export build  
- [ ] Pages URL loads (enable Pages → GitHub Actions after merge)  
- [x] `output: 'export'` is set  
- [x] `.env.example` documents public Supabase keys and a **non-public** `USDA_FDC_API_KEY` (tools/CI only)

**Completed (19 Aug 2026):** Next.js App Router + TypeScript + Tailwind in the repo root. `basePath` `/Katies-Adventures-2_Chapter-2`, `trailingSlash`, unoptimized images. shadcn + `@aceternity` registry (Plan bento only). Placeholder `/`, `/onboarding`, `/plan`, `/settings` (and `/log` for the four-tab nav). `src/data/owner.ts` + throwing `src/data/client.ts`. GitHub Action deploys `out/` to Pages. `public/.nojekyll`. No Prisma, NextAuth, or Server Actions. No `service_role` / USDA in `NEXT_PUBLIC_`. Next: Phase 4 data gateway **+ magic-link auth** (do not apply SQL without credentials). Do not re-scaffold this phase for mixed week or auth — those are Phase 1/2 spec + Phase 4 implementation.  

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

## Phase 4 — Supabase data gateway + magic-link auth

**Status:** Complete (19 Aug 2026). Live RLS + Pages keys + owner same-device magic-link prove-it.

**Goal:** The signed-in owner can persist a Profile through `src/data`, scoped by `auth.uid()`. Phase 4b is **retired** — do not ship an open `DEFAULT_OWNER_ID` policy and remap later.

### Design

- SQL migrations + RLS as in §2.2 (`authenticated`, `owner_id = auth.uid()`, revoke `anon`). Include `training_days`.  
- `src/data/client.ts`, `src/data/owner.ts` (`getOwnerId()` from session or throw; `DEFAULT_OWNER_ID` test/fixture only), `src/data/profiles.ts`, `src/data/training-days.ts`.  
- Magic link on Settings and `/lock`. Signed-out empty state with CTA.  
- Human wizard: create Supabase project, enable Email auth, paste URL + anon key into GitHub Actions secrets and `.env.local`, add the GitHub Pages origin to the Auth allow-list.

### Develop

- Apply `0001_init.sql` (auth-scoped RLS from the first apply).  
- Generate TypeScript types (`supabase gen types`).  
- Send magic link; persist session in the existing browser client.  
- Settings or onboarding can save height/weight **and** the weekday setting map, then reload them after refresh when signed in.  
- Tests: gateway always sends `owner_id` from the session; a mocked client never queries unscoped tables; signed-out calls throw.

### Review

- Manual: sign in, save profile, hard refresh, data still there.  
- Incognito / signed-out anon cannot read/write personal rows.  
- Confirm `service_role` is not in the repo or Pages bundle.  
- Pages still static; no NextAuth.

### Gate

- [x] Gateway + tests: unscoped queries impossible through `src/data`; signed-out throws; `DEFAULT_OWNER_ID` is not a write path
- [x] Magic-link UI on Settings and `/lock`; signed-out empty state
- [x] RLS SQL: `owner_id = auth.uid()`; anon revoked; no `is_v1_owner`
- [x] Wizard/checklist for the owner’s dashboard clicks (project, Auth, secrets, CORS)
- [x] Owner can sign in on the phone with a magic link **(owner completed same-device email click; `/lock/` “you are in”)**
- [x] Profile + `training_days` round-trip on Pages against live Supabase **(owner saved height/weight + ≥1 train day; hard-refresh; Pages bundle has project URL + publishable key; `prove-supabase-anon.sh` green)**
- [x] All access via `src/data`
- [x] Pages still static; no NextAuth / Prisma runtime

**Completed (19 Aug 2026):** `@supabase/supabase-js` only under `src/data`. `createBrowserClient()` persists the magic-link JWT. `getOwnerId()` reads `session.user.id` or throws. `profiles` + `training_days` writes always set `owner_id` from the session. Settings + `/lock` send `signInWithOtp`. Tests cover unscoped-query impossibility and incognito/signed-out. SQL: `0001_init.sql` + optional `0002_owner_auth_fk.sql` + **`0003_repair_auth_rls.sql` for draft schemas**. Owner: `docs/wizard/supabase-pages.md` or `bash scripts/wizard-supabase-pages.sh`. **Live prove-it:** `0003` applied; anon GET/POST personal tables 401 `42501`; GitHub Actions baked `NEXT_PUBLIC_SUPABASE_*` into Pages (`https://nfernie.github.io/Katies-Adventures-2_Chapter-2/` — signed-out empty state, no “not configured” note, no `service_role` in the bundle); owner completed same-device magic link + save. Phase 4 gate is green.

**Do not** build NextAuth. **Do not** apply the old open v1-owner policy.

**Further planning if:** credentials are missing — stop and run the wizard; do not fake production. Google/Apple OAuth, family accounts, and leaked-policy recovery (rotate anon key) stay further planning.

### Implementation-agent prompt

```text
You are the Phase 4 data-gateway + auth agent. Read InitialPlan180826.md
revision 5 §2.2–2.3, docs/decisions/0004-auth-at-persistence.md, and the
Phase 2 SQL draft. Load tdd, wizard, code-review.

Implement supabase-js behind src/data only. getOwnerId() reads
session.user.id or throws. DEFAULT_OWNER_ID is test/fixture only — never
production writes. owner_id on every personal write including
training_days. RLS: authenticated, owner_id = auth.uid(); revoke anon.
No is_v1_owner open policy. No remap from a previous open policy.

Magic link email (Supabase Auth). Settings and/or /lock. Signed-out
empty state. No Google OAuth, no passwords-as-product, no NextAuth.

If the owner has not created a Supabase project, write
docs/wizard/supabase-pages.md with exact dashboard clicks (including
Email auth + redirect URLs) and stop.

Tests: unscoped queries are impossible through the gateway API.
Incognito must not see personal rows. Review with code-review.
Do not add NextAuth or Prisma runtime.
```

---

## Phase 5 — Onboarding + planning engine

**Status:** Engine + onboarding shipped (19 Aug 2026). `/impeccable critique` on onboarding done (26/40; P0/P1 applied).

### Design

- 4–5 short steps. Collect InBody/Tanita numbers, goal type, diet/kitchen flags, **7-weekday training map** (rest or gym / home / bands / bodyweight; ≥1 train day), user-selected timeline. Preview kcal / protein / weeks before commit. Magic link may already exist from Phase 4; do not add a second “create account” funnel.  
- Copy when the chosen date is faster than the loss cap (offer the fastest safe date). No other medical blocks.

### Develop

- TDD `src/engine` with `trainingWeek` (PAL from train-day **count**; energy fixtures unchanged). Persist via `src/data` using the session owner.  
- Male and female fixtures (mixed week maps); floors; loss cap.

### Review

- Fixtures match spec. Onboarding on 375px. Disclaimer on review step.

### Gate

- [x] Engine tests green (kcal literals unchanged; week maps mixed)  
- [x] PlanVersion persisted for `auth.uid()`  
- [x] Unsafe **loss speed** blocked; other medical hard-stops **not** implemented  
- [x] `/impeccable critique` on onboarding  

**Completed (19 Aug 2026):** Pure `src/engine/planEnergyAndTraining` vs `docs/domain/fixtures/engine-examples.json` (male 2270 / female 1930 / unsafe `2026-10-16`). Independent recompute: `node scripts/recompute-engine-fixtures.mjs`. `commitPlanVersion` writes profile, `training_days`, goal, plan, `plan_versions`, and dummy meal slots through `src/data` with session `owner_id`. Five-step onboarding (You → printout → Aim → kitchen/week → review). Yellow Continue band. Disclaimer on review. No BMI/age/pregnancy blocks. Dummy meal titles on Today. Critique: 26/40; P0 magic-link stay-on-flow + draft restore; missing diet flags added.  

### Implementation-agent prompt

```text
You are the Phase 5 engine agent. Read engine-spec.md and §5.3. Load tdd,
implement, impeccable, ui-ux-pro-max.

Pure engine first, then onboarding (InBody/Tanita, metric, M/F, mixed
training week, user diet/kitchen/goal/timeline). Persist through
src/data only (owner_id from getOwnerId() session). Dummy meal titles OK.
PAL and split from train-day count; each session later filters by that
day’s setting. Block unsafe loss speed only — no BMI/age/pregnancy
hard-stops. Do not change locked kcal/macro fixtures.

Review: code-review + independent fixture check.
```

---

## Phase 6 — Recipes, USDA enrich, and meal plan UI

**Status:** Pipeline + meal UI shipped; **catalog is not done.** `USDA_FDC_API_KEY` is missing in this environment. Owner must run `bash scripts/wizard-usda-fdc.sh`, then enrich, before `data/recipes.json` is mergeable.

### Design

- MealCard, day strip, SwapSheet. Empty state if filters match nothing.  
- Recipe JSON + cache layout per §4.2.

### Develop

- `tools/nutrition/` enrich + `npm run nutrition:check`.  
- `data/nutrition/fdc-cache.json` exists as an empty layout (`foods: {}`). Real foods land only after enrich with a data.gov key.  
- Seed `data/recipes.json` **only after** enrich (no LLM-only macros). **Not committed.**  
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
- [x] Assigner tests green  
- [x] Swap + pin (data gateway + Today sheet; empty catalog until enrich)  
- [ ] Owner can cook 3 sample days  
- [x] No live USDA from Pages  

**Stopped (19 Aug 2026):** FDC key missing. Wizard: `scripts/wizard-usda-fdc.sh` + `docs/wizard/usda-fdc.md`. `tools/nutrition` sums grams × cache per 100 g; `npm run nutrition:check` refuses LLM/zero macros and cache misses. No `data/recipes.json` committed. Assigner never returns meat on a vegetarian flag. Today lists four slots + Swap sheet; swaps/pins/eaten go through `src/data` with session `owner_id`.  

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
src/data (owner_id from the signed-in session). No ScrapeGraphAI unless
Phase 9 is open. No public recipe write API.

If USDA_FDC_API_KEY is missing, write a wizard for the data.gov FDC key
and stop before claiming the catalog is done.
```

---

## Phase 7 — Exercise catalog and workout UI

**Goal:** Weekly sessions from the mixed-week map; swap/complete/skip **in that day’s setting**.

### Design

- One-exercise-at-a-time on mobile. Deload copy. Timer optional (skip if it delays the gate). Week strip shows each day’s setting.

### Develop

- `data/exercises.json` tagged with `tracks: ["gym"|"home"|"bands"|"bodyweight"]`. `src/engine/training.ts` maps split slots onto train days Monday-first and filters the catalog by **that day’s** setting. Persist completions.

### Review

- Mixed-week catalog (all four settings represented). Swaps stay in-setting + same movement pattern. Critique cognitive load. Cardio sessions appear as the generator suggests.

### Gate

- [ ] Training tests green  
- [ ] Complete/skip persisted  
- [ ] Volume from engine rules, not a gendered UI  
- [ ] A gym Tuesday / bands Thursday week yields different exercise pools those days  

### Implementation-agent prompt

```text
You are the Phase 7 training agent. Read engine-spec training section,
content-model.md, and DESIGN.md. Load tdd, refero-design, impeccable.

JSON exercise catalog tagged by tracks (gym, home, bands, bodyweight).
Split from train-day count; map slots onto the mixed week Monday-first.
Each session and its swap pool must match that day’s setting. Cardio is
generator-chosen. Persist through src/data (session owner). Text cues
only. Same movement rules for male and female.
```

---

## Phase 8 — Timelines, check-ins, plan access and updates

**Goal:** Reopen, follow, regenerate without destroying history.

### Design

- Timeline rail, weekly InBody/Tanita / BodyID check-in (no photos), regenerate confirmation (pins kept).

### Develop

- Check-ins CRUD via gateway. PlanVersion list. Preview remaining timeline from latest weight.

### Review

- Playwright (or equivalent): magic-link (or stubbed session) → onboard → meals → swap → workout complete → check-in → regenerate with pin.  
- Old versions read-only.  
- E2E uses a **signed-in test session** (or stubbed `src/data` that pretends one). Do not disable RLS globally. `DEFAULT_OWNER_ID` is fixture-only, not a production write path.

### Gate

- [ ] Happy path green on CI  
- [ ] History preserved  
- [ ] Timeline cap enforced  

### Implementation-agent prompt

```text
You are the Phase 8 timeline agent. Read §4.1 update rules. Load tdd,
implement, code-review.

Check-ins, timeline, PlanVersion history, regenerate with pins.
E2E with a magic-link or stubbed session. Stub src/data rather than
disabling RLS globally. No wearables. No NextAuth.
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

## Phase 10 — Polish and launch (auth is in)

**Goal:** Ship a mobile Pages app that feels intentional.

### Design

- `/impeccable polish` + `harden`. Reduced motion.

### Develop

- Loading/error/empty on primary routes, including signed-out. `noindex` if the owner wants the tool unlisted (further planning: `robots.txt` + unlisted repo does not hide a public Pages site).  
- README: local `next dev`, env, seed, Pages deploy, disclaimer, **how magic-link sign-in works**.  
- Auth rate limits: use Supabase project defaults; document them.

### Review

- Audit + Lighthouse a11y on Today, Onboarding, Meals.  
- iPhone Safari and Android Chrome.  
- Recheck bundle for `service_role`.  
- Incognito cannot read personal rows.

### Gate

- [ ] Audit defects fixed or waived  
- [ ] E2E green (signed-in path)  
- [ ] Disclaimer on generate + footer  
- [ ] Owner launch approval  
- [ ] `docs/launch.md` notes magic-link Auth + RLS (`auth.uid()`); no open-anon personal tables  

### Implementation-agent prompt

```text
You are the Phase 10 launch agent. Load impeccable audit/polish/harden,
ui-ux-pro-max, code-review. No new features. Auth is already in (Phase 4
magic link) — do not invent NextAuth or a second login wall.

docs/launch.md: Pages URL, GitHub secrets, Email auth redirect URLs,
reminder that personal rows require a signed-in session (RLS
owner_id = auth.uid()).
```

---

## 7. Cross-cutting rules for implementation agents

1. Read this file, `DESIGN.md`, and `PRODUCT.md` before coding.  
2. TypeScript strict.  
3. Engine stays pure.  
4. **Static export on GitHub Pages** is the v1 host. Do not silently switch to Netlify.  
5. **No `service_role` in the client.** No secrets in git.  
6. **No NextAuth in v1.** Auth = Supabase Auth **email magic link in Phase 4** (not a later 4b).  
7. **No unscoped personal queries.** Data gateway only.  
8. **`owner_id` on every personal row.** Production owner is `auth.uid()`.  
9. No medical guarantees. No default scraping.  
10. Refero + Impeccable + UX Pro Max + Aceternity (lightly) on new screens.  
11. **§3 is frozen** (including revision 5 amendments to Q9 and Q18). Do not re-open imperial, photos, NextAuth, or OAuth.  
12. **Recipe macros = USDA write-time (§4.2).** No live USDA in the Pages app. No merge of `data/recipes.json` without `nutrition:check`.  
13. **Mixed training week.** Do not collapse settings into one global track. PAL from train-day **count**.

---

## 8. Suggested first prompts (owner → agents)

**A.** Phase 0 — **done.** Brief is `PRODUCT.md` / ADRs from frozen §3. Do not re-interview.  
**B.** Phase 1 — **prototype done** (revision 5: mixed week + magic-link copy). Screens are `docs/ux/prototype/index.html`.  
**C.** Phase 3 — **scaffold done.** Phase 4 — **done.** Phase 5 — **done** (engine + onboarding). Phase 6 is USDA meals.  
**D.** There is **no Phase 4b**. Do not defer auth.

---

## 9. Out of scope for v1

- NextAuth.js / Auth.js  
- Prisma in the running website  
- Google / Apple OAuth, password forms as the product  
- Native apps, wearables, progress photos, AI body-scan  
- Imperial units  
- Grocery delivery, social, coaching marketplace  
- Commercial recipe scraping  
- Public multi-user SaaS  
- An open anon `DEFAULT_OWNER_ID` policy “until later”  

Home / bands / bodyweight are **in** v1 as weekday settings, not as a later catalog-only extra. Magic-link auth is **in** Phase 4.

---

## 10. What to expect (plain language)

BodyPlan is a personal 18+ planner. You type InBody/Tanita (BodyID) numbers, pick a goal, diet, kitchen style, a **week of training settings** (gym some days, bands or home on others, rest on others), and a timeline. It builds meals from a recipe list in the repo whose **calories and macros were checked against USDA when that list was written** (not when you open the app) and a workout for **that day’s kit** (including any cardio the plan thinks you need). You can swap meals and lifts inside the same setting. It will not let you pick a dangerously fast weight-loss date. It will not block you for BMI or age. There are no photos. The site lives on GitHub Pages and remembers your data in Supabase **after you sign in with an email magic link**.

Phase 0–5 engine/onboarding are in the repo. Phase 4 live persist is on. Later agents should not ask the §3 questions again. Next is Phase 6 (USDA meals).
