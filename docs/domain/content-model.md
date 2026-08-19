# Catalog content model

Git-owned libraries. **No `owner_id`.** The public site does not write these files. Personal swaps/pins reference slugs. Nutrition follows `docs/domain/recipe-nutrition.md` and `InitialPlan180826.md` **§4.2**.

---

## Diet flags (user-select)

Stored on `profiles.diet_flags` as this closed slug list. A recipe is eligible when **every** selected flag is satisfied (AND). Unselected flags impose no constraint.

| Slug | Means | Recipe must |
| --- | --- | --- |
| `vegetarian` | No meat or fish | `dietTags` includes `vegetarian` **or** `vegan` |
| `vegan` | No animal products | `dietTags` includes `vegan` |
| `allergy_nuts` | Tree-nut / peanut free | `allergens` does not include `nuts` |
| `allergy_dairy` | No dairy | `allergens` does not include `dairy` |
| `allergy_gluten` | No gluten | `allergens` does not include `gluten` |
| `allergy_shellfish` | No shellfish | `allergens` does not include `shellfish` |
| `allergy_egg` | No egg | `allergens` does not include `egg` |
| `allergy_soy` | No soy | `allergens` does not include `soy` |
| `cook_under_30` | Active cook time ≤ 30 min | `cookMinutes <= 30` |

`vegan` implies vegetarian for matching (a vegan recipe may be used on a vegetarian plan). Selecting both is allowed; vegan is stricter.

Prototype chips `allergy` and `quick` map to `allergy_nuts` and `cook_under_30`.

`profiles.servings` (integer ≥ 1) scales ingredient grams in the UI; catalog nutrition is per **as-written** recipe yield (`servings` on the recipe JSON).

---

## Kitchen flags (user-select)

Stored on `profiles.kitchen_flags`. AND-matched like diet.

| Slug | Means | Recipe must |
| --- | --- | --- |
| `batch_cook` | Cook once, eat later | `kitchenTags` includes `batch_cook` |
| `leftovers_as_lunch` | Dinner yield covers next lunch | `kitchenTags` includes `leftovers_as_lunch` (typically also `batch_cook`) |
| `eating_out_days` | Owner will eat out some days | Not a recipe filter. Planner may leave a meal slot as `slug: "eating-out"` (personal row, not catalog). Catalog still has no `owner_id`. |

Prototype chips `batch` / `leftovers` / `out` map to the slugs above.

---

## Meal slots

Every planned day has four slots: `breakfast`, `lunch`, `dinner`, `snack`. A recipe declares `slots: [...]` subset. Swap band (product rule): same slot, ±10% kcal, ±20% protein vs the slot target.

---

## Recipe JSON (`data/recipes.json`)

Array of objects. Do not merge until `nutrition:check` (Phase 6) passes. No live USDA in the app. `nutrition.source` must be `"usda-fdc"`.

```json
{
  "slug": "greek-yogurt-berry-bowl",
  "title": "Greek yogurt berry bowl",
  "slots": ["breakfast", "snack"],
  "dietTags": ["vegetarian"],
  "allergens": ["dairy"],
  "kitchenTags": ["batch_cook"],
  "cookMinutes": 10,
  "servings": 1,
  "equipment": ["none"],
  "steps": ["Stir yogurt and berries."],
  "ingredients": [
    {
      "name": "Greek yogurt, plain, nonfat",
      "grams": 200,
      "household": "1 cup",
      "fdcId": 170903,
      "matchNote": "FDC nonfat Greek yogurt"
    }
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

Rules:

- Every ingredient has **`grams`** (metric) and **`fdcId`** (USDA FoodData Central).
- `nutrition.source` is exactly `usda-fdc`. Other values fail CI.
- Macros are write-time sums from FDC, not LLM guesses, not commercial site labels.
- 4-4-9 checksum: `|kcal - (4·proteinG + 4·carbG + 9·fatG)|` within the Phase 6 tolerance.
- Recipes list kitchen equipment (`oven`, `hob`, `none`). Training settings live on exercises, not recipes.

Phase 6 wrote the seed file. Phase 9 grows it via `npm run ingest:recipes` (USDA enrich, no overwrite of reviewed slugs).

---

## Exercise JSON (`data/exercises.json`)

Movements tagged by **track**. **Not** USDA-checked. No `owner_id`. A session on a given weekday may only use rows whose `tracks` include **that day’s** setting. Swaps stay in-setting + same `pattern`.

```json
{
  "slug": "barbell-back-squat",
  "title": "Barbell back squat",
  "pattern": "squat",
  "tracks": ["gym"],
  "equipment": ["barbell", "rack"],
  "laterality": "bilateral",
  "defaultSets": 3,
  "defaultReps": "5-8",
  "cue": "Sit between the hips. Keep the chest tall."
}
```

`tracks` is a non-empty subset of `gym` | `home` | `bands` | `bodyweight`. An exercise may appear in more than one (example: a bodyweight squat tagged `["home","bodyweight"]`).

Each row has a `cue` string — **text only**. No photos or video. Optional `source` / `sourceUrl` / `license` (wger CC-BY-SA) are ingest metadata; the app mapper ignores them.

Sex does not change the movement rules. Cardio entries (`zone2-walk`, `bike-intervals`) may exist as catalog rows the **generator** picks; they are not an onboarding preference. Cardio rows still declare which settings they can use (a gym bike vs a walk).

---

## What is not catalog

Pins, swaps, eaten ticks, favorites, eating-out placeholders — personal Supabase rows with `owner_id`. See `docs/domain/erd.md`.
