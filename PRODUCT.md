# BodyPlan

<!-- impeccable:product-schema 1 -->

BodyPlan is a personal 18+ gym planner for one adult. The owner enters InBody / Tanita (BodyID) numbers, chooses a goal, diet flags, kitchen flags, gym days per week, and a timeline; the app builds meals and gym sessions they can follow and swap.

## Platform

web

## Stack

Next.js static export on GitHub Pages (frozen, InitialPlan revision 4). Production app is the App Router scaffold in `src/`. The Phase 1 HTML prototype in `docs/ux/prototype/` remains a reference, not the shipped site.

## Users

One adult gym-goer (the Owner), 18+, using a phone at the gym or kitchen. They have an InBody / Tanita (BodyID) printout in hand. They are not creating an account.

## Product Purpose

Turn machine numbers + a few choices into today’s meals and gym session, then let the Owner check them off and swap. Success: first plan in under three minutes, no sign-up.

## Positioning

Plans from BodyID machine fields and a USDA-checked owned catalog — not photos, not a public food log, not a social gym feed.

## Operating Context

Bright gym floor and kitchen counters. Metric printouts (kg, cm, %). Sweaty-thumb taps between sets. Four meal slots plus one session per training day.

## Capabilities and Constraints

Confirmed in frozen §3 below. No login wall in v1. No photos. No imperial. Gym equipment only. Unsafe loss speed is the only generator block. Later lock is magic link (Phase 4b).

## Brand Commitments

In-app name is **BodyPlan**. Katie’s Adventures is the repo name only. Copy does not claim medical treatment.

## Evidence on Hand

No photography, no testimonials, no competitor screenshots in the product. Recipe macros are USDA write-time; InBody fields are typed by the Owner. Prototype data is labelled synthetic.

## Product Principles

1. The Owner is already in the building — skip the funnel.
2. Numbers from the machine and USDA are louder than chrome.
3. One job on Today: eat and lift what was planned, or swap.
4. Familiar gym/kitchen affordances over SaaS surprise.
5. Auth-ready without looking like a login product.

## Accessibility & Inclusion

WCAG 2.2 AA intent: 4.5:1 text contrast, 44×44 px targets, visible focus, `prefers-reduced-motion`, labelled inputs, numeric keyboards for kg/cm/% . Intended audience 18+. Sex is male or female only (Mifflin–St Jeor).

This file is the agent-facing product brief. The freeze it restates is `InitialPlan180826.md` **§3** (18 Aug 2026, revision 4). If this file and §3 ever disagree, **§3 wins** — do not invent extras that conflict. Language: `CONTEXT.md`. Hosting and lock: `docs/decisions/0001-v1-scope.md`, `docs/decisions/0002-auth-ready-static.md`.

**v1 host:** GitHub Pages **project** site (`username.github.io/Katies-Adventures-2_Chapter-2`) + Next.js `basePath` + browser `supabase-js`. Single user. No login wall. Auth-ready `owner_id` and data gateway.

Katie’s Adventures is the **repo / chapter container**. It is not the in-app product name.

---

## Frozen v1 (quote of §3)

### Product and people

| # | Decision |
| --- | --- |
| 1 | **BodyPlan.** Personal planner. In-app UI is BodyPlan, not Katie’s Adventures. |
| 2 | **18+** intended audience and copy. Not a child product. |
| 3 | **Male or female** only (Mifflin–St Jeor). No prefer-not-to-say. |
| 4 | **Metric only** (cm, kg). No imperial toggle. |
| 5 | Body composition source: **InBody / Tanita** (BodyID-class machine). Profile and check-ins use machine readouts. Fields: `docs/domain/inbody-fields.md`. |
| 6 | Goal type is **user-selected**: fat loss, fat loss + retain muscle, recomp, or maintain. |

### Nutrition and training

| # | Decision |
| --- | --- |
| 7 | Dietary constraints are **user-selected** at onboarding (vegetarian, vegan, allergies, cooking time, servings, and similar flags). The catalog must support the filters offered. |
| 8 | Kitchen reality is **user-selected** (batch-cook, leftovers as lunch, eating-out days, and similar flags). |
| 9 | **Gym** equipment track only. **User selects days per week.** |
| 10 | Cardio is **whatever the workout generator suggests** for the chosen goal and gym days — not a separate onboarding preference. |
| 11 | Timeline is **user-selected**. The engine **blocks unsafe loss speed** (cap in §5.3: 1.0% body weight / week; user may go slower). |
| 12 | Recipes: **owned JSON** (`data/recipes.json`). Macros are **USDA FoodData Central–computed at write/CI time** (`docs/domain/recipe-nutrition.md`). Not a live API from the website. |
| 13 | Exercises: **owned JSON** (`data/exercises.json`). Not USDA-checked. |

### Legal, content, later auth

| # | Decision |
| --- | --- |
| 14 | **Disclaimer yes. Hard-stops no** except **unsafe loss speed**. No generator block for pregnancy, eating-disorder history, BMI floor, or age. Copy must not claim medical treatment. Intended users are 18+. |
| 15 | **Swaps allowed** (meals and lifts). |
| 16 | **No photos.** Progress is weight + InBody/Tanita / BodyID machine fields (same family as onboarding). |
| 17 | GitHub Pages **project site** with Next.js **`basePath`**. |
| 18 | Later lock (Phase 4b, after the owner has used the app): email **magic link** only. No Google OAuth in the first lock. |
| 19 | That lock is for **random visitors** to a public Pages site. Recovering from a leaked anon policy is further planning. |

---

## What the owner does in v1

1. Opens the site with no account-creation step. First plan in under three minutes is the Phase 1 bar.
2. Onboards: sex (male/female), age, height (cm), InBody/Tanita fields, goal type, timeline, diet flags, kitchen flags, gym days/week.
3. Reviews kcal / protein / weeks, with a disclaimer. If the chosen date is faster than the loss cap, the engine refuses that date and offers the fastest safe date.
4. Uses **Today** (four meal cards + today’s workout), **This week**, **Plan**, **Library**, **History**.
5. Swaps a meal (±10% kcal, ±20% protein, same slot), pins recipes, shuffles unpinned slots, swaps an exercise (same movement pattern + gym equipment), logs weigh-ins and machine check-ins.
6. Regenerating creates a new plan version; old weeks stay readable. Catalog updates from git appear in **future** swaps only.

Surfaces and routes: `InitialPlan180826.md` §5.1. Bottom nav: Today · Plan · Log · You. `/lock` is Phase 4b only.

---

## Catalog and nutrition

The website reads committed JSON. Recipe kcal / protein / carbs / fat are filled by the USDA write-time pipeline before merge — never guessed by an LLM, never copied from a commercial recipe-site label as if they were USDA, never fetched from FoodData Central in the browser.

Contract: `docs/domain/recipe-nutrition.md` (restates §4.2).

Minimum catalog size (Phase 6): ~40 breakfasts, ~40 lunches, ~40 dinners, ~25 snacks (vegetarian coverage); ~50–80 gym exercises.

---

## Data stance (v1)

Personal rows live in Supabase so a new phone or a cleared cache still has the plan. Catalog JSON is git-owned so the anon key cannot poison the library.

Every personal row has `owner_id`. v1 uses `DEFAULT_OWNER_ID`. All database calls go through the **data gateway**. No login screen. Phase 4b remaps that constant to `auth.uid()` and switches on magic link — `docs/decisions/0002-auth-ready-static.md`.

The planning engine is pure maths: no storage, no owner id, no React.

Until Phase 4b, a public Pages URL plus the public anon key can read/write the same personal rows. That is accepted for this personal tool. Never put `service_role` in the website.

---

## Agent rules (v1)

- Treat §3 as closed. Phase 2 may name leftover InBody extras and diet/kitchen flag vocabulary; those names must stay consistent with this brief.
- Ship metric, gym-only training, male/female, InBody/Tanita check-ins, user-selected diet / kitchen / days / goal / timeline.
- Block **unsafe loss speed** only. Show a disclaimer. Use calorie floors as targets or warnings only if a later spec says so — not as a “see a doctor” gate.
- Keep recipe macros on the USDA write-time contract. Keep USDA keys and clients out of the Next.js bundle.
- Keep personal access behind the data gateway and `owner_id`.
- Leave a quiet Settings slot for a later “Lock with email” card. Do not encode “logged in” into routes.

---

## Out of v1

NextAuth.js / Auth.js, Prisma in the running website, a login wall, OAuth, passwords, native apps, wearables, progress photos, AI body-scan, imperial units, home / bands / bodyweight tracks, grocery delivery, social, coaching marketplace, commercial recipe scraping, public multi-user SaaS, live USDA from Pages, medical-treatment claims.
