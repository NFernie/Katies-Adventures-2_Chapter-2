# Content sources (Phase 9)

Legal allowlist for laptop ingest. Record a decision here **before** any scrape job. Prefer first-party JSON and licensed APIs. Never scrape on page view. Never write scrape or third-party calories straight into `data/recipes.json`.

Source: `InitialPlan180826.md` §4.2–4.4 and `.agents/skills/scrapegraph-content-ingest/SKILL.md`. Machine-readable copy: `tools/ingest/sources.json`.

## Allowed

| Source | Use | Notes |
| --- | --- | --- |
| First-party drafts (`data/ingest/recipe-drafts.json`) | Recipe ideas + grams + `fdcId` | Macros still come from `tools/nutrition` (USDA FDC cache / enrich). |
| USDA FoodData Central API | Macros only | Existing Phase 6 enricher. `USDA_FDC_API_KEY` in gitignored `.env` / Actions. Not `NEXT_PUBLIC_`. |
| USDA MyPlate Kitchen via Internet Archive | Recipe text (title, household ingredients, steps) | Wayback captures of `myplate.gov/recipes/` and `myplate.gov/myplate-kitchen/`. Laptop/agent ingest only. Macros still USDA FDC. Prefixes in `tools/ingest/sources.json`. Do **not** use myplate.food. |
| wger.de `/api/v2/exerciseinfo` (and related **exercise** endpoints) | Exercises only | CC-BY-SA. Text cues. No photos/video. Do **not** call ingredient or nutritionplan endpoints. |

## Not wired (ideas only if ever used)

Spoonacular and Edamam may suggest ingredient *lists*. They must not land macros in `data/recipes.json`. Those drafts still go through §4.2 USDA.

## Denied (do not scrape)

Allrecipes, NYT Cooking, BBC Good Food, Bodybuilding.com, Tasty, Food Network, Epicurious, Bon Appétit, **myplate.food** (independent archive; free terms forbid mirroring), and any commercial recipe or workout site without written permission. Login, paywall, and CAPTCHA pages are out.

## ScrapeGraphAI

MyPlate Kitchen is signed off **only** as Internet Archive captures of `myplate.gov/recipes/` and `myplate.gov/myplate-kitchen/` (`signedOffScrapeUrlPrefixes`). The default ingest parser is deterministic HTML in `tools/ingest/myplate-html.ts`, not ScrapeGraphAI. `scrapegraph_draft.py` still never writes the catalog. Do not sign off myplate.food.

## Merge rules

- Recipes: `npm run ingest:recipes` runs the Phase 6 USDA sum/check, then appends. Reviewed catalog slugs (default: already in `data/recipes.json`) are not overwritten.
- Exercises: `npm run ingest:exercises` maps wger `exerciseinfo` JSON. Existing slugs stay. Unmapped patterns (abs, isolation) are skipped.
- PRs are JSON-only. `npm run nutrition:check` must be green. The Next.js client must not import scrapegraphai, USDA, or wger.
