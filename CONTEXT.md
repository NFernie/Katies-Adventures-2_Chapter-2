# BodyPlan

Vocabulary for the personal gym planner in this repo. Use these terms in specs, ADRs, and code names. Implementation paths and host details live in `PRODUCT.md` and `docs/decisions/`.

## Product

**BodyPlan**:
The in-app product: a personal 18+ planner for one adult.
_Avoid_: Katie’s Adventures (repo / chapter container only), SaaS, coach marketplace

**Owner**:
The single adult who uses BodyPlan in v1.
_Avoid_: customer, tenant, member, end user (when you mean this one person)

## Body

**BodyID**:
The class of gym body-composition machine BodyPlan is built around — InBody and Tanita printouts in that family.
_Avoid_: tape estimate, photo scan, smart scale as the v1 source of truth

**InBody / Tanita fields**:
Machine readouts captured at onboarding and check-in: weight, body fat %, skeletal muscle mass, plus optional extras in that family.
_Avoid_: progress photos, segmental charts (further planning)

**Sex**:
Male or female, used for Mifflin–St Jeor.
_Avoid_: prefer-not-to-say, gender identity (v1 has no third option)

**Metric**:
Centimetres and kilograms as the only units.
_Avoid_: imperial, lb, inches, unit toggle

## Goals and plans

**Goal type**:
The owner’s chosen aim: `fat_loss`, `fat_loss_retain_muscle`, `recomp`, or `maintain`.
_Avoid_: cut, bulk, tone, “get in shape”

**Timeline**:
The owner-selected target date or duration for the current Goal type.
_Avoid_: fixed 12-week default the owner cannot slow down

**Unsafe loss speed**:
A Timeline that would require losing more than 1.0% of body weight per week. The only generator block in v1.
_Avoid_: BMI hard-stop, age gate, pregnancy block, ED-history block

**PAL**:
The activity factor multiplied by BMR to get TDEE, taken only from the **count** of non-rest training weekdays (1–2 → 1.375, 3–5 → 1.55, 6–7 → 1.725). The day’s kit (gym vs bands) does not change PAL.
_Avoid_: a separate NEAT questionnaire, machine-printed BMR, PAL-by-setting

**Training setting**:
Where a given weekday’s session happens: `gym`, `home`, `bands`, or `bodyweight`. Rest days have no setting.
_Avoid_: one global track for the whole plan

**Training week**:
Seven weekdays. Each is rest (no `training_days` row) or one Training setting. At least one train day. Stored on `training_days`.
_Avoid_: `gym_days_per_week` on `profiles`

**Energy target**:
Daily kcal the engine emits after TDEE minus the timeline deficit, rounded to the nearest 10 kcal.
_Avoid_: eating the machine BMR, ad-lib cut

**Calorie-floor warning**:
A note when the Energy target is below 1200 kcal (female) or 1500 kcal (male). Generate still succeeds.
_Avoid_: medical hard-stop, “see a doctor” gate, silently raising kcal

**Deload**:
Every 4th week of the Timeline, planned sets drop; not a rest-week preference the Owner picks.
_Avoid_: optional deload toggle in onboarding

**Diet flag**:
A closed user-select tag (vegetarian, vegan, named allergies, cook-under-30) that filters the Recipe catalog.
_Avoid_: free-text diet, open tag soup

**Kitchen flag**:
A closed user-select tag (batch-cook, leftovers as lunch, eating-out days) that filters or skips meal slots.
_Avoid_: a second equipment track

**Split**:
The session pattern implied by **train-day count** (full body, upper/lower, PPL). Split slots land on train days in Monday-first order. Each slot still uses **that day’s** Training setting for exercise choice.
_Avoid_: sex-specific menus, PAL-by-setting

**Plan version**:
A generated calorie, macro, and split snapshot. A new version is created when the profile or goal changes; older weeks stay readable.
_Avoid_: overwriting the only plan row

**Personal plan**:
The owner’s generated week, pins, swaps, completions, and check-ins.
_Avoid_: catalog (that is shared food and movement data)

**Check-in**:
A dated BodyID snapshot (weight and InBody / Tanita fields) used for progress.
_Avoid_: progress photo, weigh-in photo

## Catalog

**Catalog**:
The git-owned recipe and exercise libraries shipped with the site.
_Avoid_: user-writable public food library, live USDA, scraped commercial recipes

**Recipe**:
A catalog meal with ingredients in grams, each matched to a USDA food, and macros filled at write time.
_Avoid_: LLM-only macros, commercial nutrition labels presented as USDA

**USDA write-time nutrition**:
Macros computed from USDA FoodData Central when a Recipe is authored or CI runs, then stored on the Recipe.
_Avoid_: live USDA from the website, runtime FDC client

**Exercise**:
A catalog movement tagged with `tracks` (`gym`, `home`, `bands`, `bodyweight`). Exercises are not USDA-checked. A session may only pick rows whose tracks include **that day’s** setting.
_Avoid_: a separate library per setting that ignores the week map

**Swap**:
Replacing one meal or exercise in the Personal plan with an allowed alternative (meals: same slot / kcal and protein bands; lifts: same movement pattern **and that day’s Training setting**).
_Avoid_: editing the Catalog from the public site

**Pin**:
A Recipe the owner has locked in a slot so regeneration must keep it.

## Ownership

**owner_id**:
The UUID on every personal row that says whose data it is. Catalog rows do not have one.
_Avoid_: a singleton table with no owner, NextAuth `Account` / `Session` tables

**DEFAULT_OWNER_ID**:
A committed UUID (`198e5a49-c748-4bcc-b6ad-86445a76eb7b`) used **only** in tests and fixtures. Production writes use `auth.uid()` from the magic-link session.
_Avoid_: baking this UUID into RLS, production inserts, an open anon policy

**Magic link**:
Supabase Auth email sign-in, implemented in Phase 4 with the data gateway. No Google OAuth, no NextAuth. Settings and `/lock` send the mail. Live project setup: `docs/wizard/supabase-pages.md`.
_Avoid_: Phase 4b remap, passwords-as-product

**Data gateway**:
The single authorised path for reading and writing personal storage.
_Avoid_: screens, components, or the engine calling the database directly
