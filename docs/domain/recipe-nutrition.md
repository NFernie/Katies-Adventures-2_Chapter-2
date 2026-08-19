# Recipe nutrition contract (USDA write-time)

Recipe macros are **computed from USDA FoodData Central when `data/recipes.json` is written or CI runs**. The GitHub Pages app **only reads** the committed JSON. There is no live USDA call from the browser, no FDC client in the Next.js bundle, and no `NEXT_PUBLIC_` USDA key. Source: `InitialPlan180826.md` **§4.2** (revision 4).

Exercises are a movement catalog. They are **not** USDA-checked.

## Pipeline (every new or edited recipe)

1. Author (human or agent) writes **ingredients with grams** (optional household measure for the UI).
2. Each ingredient maps to a USDA FoodData Central food (`fdcId`). Prefer Foundation / SR Legacy generic foods over random branded hits, unless the recipe truly uses that brand. Record a short `matchNote` when the match is approximate.
3. A **local or CI script** (`tools/nutrition/` — name locked in Phase 6) calls the FDC API **once per missing cache entry**, using `USDA_FDC_API_KEY` from `.env` / GitHub Actions secrets — **not** `NEXT_PUBLIC_`.
4. The script sums nutrients, writes `kcal`, `proteinG`, `carbG`, `fatG`, and a 4-4-9 checksum flag.
5. Lookups land in a committed cache (e.g. `data/nutrition/fdc-cache.json`) so later CI can re-check maths without hitting USDA on cache hits. Cache misses (new `fdcId`) may call USDA in CI.
6. PR / `npm run nutrition:check` **fails** if any recipe is missing `fdcId`s, has `nutrition.source` other than `usda-fdc`, fails checksum beyond a small rounding tolerance, or still has placeholder macros (`0` / `TODO` / LLM-only).

## Required JSON shape (conceptual)

```json
{
  "slug": "greek-yogurt-berry-bowl",
  "ingredients": [
    {
      "name": "Greek yogurt, plain, nonfat",
      "grams": 200,
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

## Rules for agents

- Do not commit `data/recipes.json` until `nutrition:check` passes.
- Do not copy commercial recipe-site nutrition labels and present them as USDA.
- If FDC has no honest match, do not invent macros — pick the closest generic food and `matchNote`, or drop the recipe.
- The Next.js bundle must not import the USDA client.
- Spoonacular, Edamam, or ScrapeGraphAI (Phase 9) may draft ingredient *lists*. Macros still go through this contract before they land in `data/recipes.json`. Legal sources: `docs/content-sources.md`. Merge: `npm run ingest:recipes`.

## Owner setup

One free [FoodData Central API key](https://fdc.nal.usda.gov/api-guide) in GitHub Actions (and local `.env`). Demo keys are too fragile for CI. If the key is missing in Phase 6, write a wizard and stop before claiming the catalog is done.

## Done when

Every seed recipe has `nutrition.source: usda-fdc` and `checksumOk`, `nutrition:check` is green, and the production JS bundle contains no USDA URL or key.
