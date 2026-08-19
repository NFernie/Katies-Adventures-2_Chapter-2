# BodyPlan

Vocabulary for the personal gym planner in this repo. Use these terms in specs, ADRs, and code names. Implementation paths and host details live in `PRODUCT.md` and `docs/decisions/`.

## Product

**BodyPlan**:
The in-app product: a personal 18+ gym planner for one adult.
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
The activity factor multiplied by BMR to get TDEE, taken only from user-selected gym days per week (1–2 → 1.375, 3–5 → 1.55, 6–7 → 1.725).
_Avoid_: a separate NEAT questionnaire, machine-printed BMR

**Energy target**:
Daily kcal the engine emits after TDEE minus the timeline deficit, rounded to the nearest 10 kcal.
_Avoid_: eating the machine BMR, ad-lib cut

**Calorie-floor warning**:
A note when the Energy target is below 1200 kcal (female) or 1500 kcal (male). Generate still succeeds.
_Avoid_: medical hard-stop, “see a doctor” gate, silently raising kcal

**Deload**:
Every 4th week of the Timeline, planned gym sets drop; not a rest-week preference the Owner picks.
_Avoid_: optional deload toggle in onboarding

**Diet flag**:
A closed user-select tag (vegetarian, vegan, named allergies, cook-under-30) that filters the Recipe catalog.
_Avoid_: free-text diet, open tag soup

**Kitchen flag**:
A closed user-select tag (batch-cook, leftovers as lunch, eating-out days) that filters or skips meal slots.
_Avoid_: a second equipment track

**Split**:
The gym session pattern implied by user-selected days per week (full body, upper/lower, PPL).
_Avoid_: home / bands / bodyweight track, sex-specific menus

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

**Exercise**:
A catalog gym movement. Exercises are not USDA-checked.
_Avoid_: home, bands, or bodyweight tracks (v1 is gym only)

**USDA write-time nutrition**:
Macros computed from USDA FoodData Central when a Recipe is authored or CI runs, then stored on the Recipe.
_Avoid_: live USDA from the website, runtime FDC client

**Swap**:
Replacing one meal or exercise in the Personal plan with an allowed alternative (same slot / movement pattern; meal swaps stay within kcal and protein bands).
_Avoid_: editing the Catalog from the public site

**Pin**:
A Recipe the owner has locked in a slot so regeneration must keep it.

## Ownership

**owner_id**:
The UUID on every personal row that says whose data it is. Catalog rows do not have one.
_Avoid_: a singleton table with no owner, NextAuth `Account` / `Session` tables

**DEFAULT_OWNER_ID**:
The one committed UUID (`198e5a49-c748-4bcc-b6ad-86445a76eb7b`) that is the Owner’s `owner_id` in v1, until a later lock remaps those rows to a signed-in user id.
_Avoid_: `auth.uid()` in v1, anonymous unscoped rows

**Data gateway**:
The single authorised path for reading and writing personal storage.
_Avoid_: screens, components, or the engine calling the database directly
