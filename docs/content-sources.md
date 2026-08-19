# Content sources (Phase 9)

Legal allowlist for laptop ingest. Record a decision here **before** any scrape job. Prefer first-party JSON and licensed APIs. Never scrape on page view. Never write scrape or third-party calories straight into `data/recipes.json`.

Source: `InitialPlan180826.md` §4.2–4.4 and `.agents/skills/scrapegraph-content-ingest/SKILL.md`. Machine-readable copy: `tools/ingest/sources.json`.

## Allowed

| Source | Use | Notes |
| --- | --- | --- |
| First-party drafts (`data/ingest/recipe-drafts.json`) | Recipe ideas + grams + `fdcId` | Macros still come from `tools/nutrition` (USDA FDC cache / enrich). |
| USDA FoodData Central API | Macros only | Existing Phase 6 enricher. `USDA_FDC_API_KEY` in gitignored `.env` / Actions. Not `NEXT_PUBLIC_`. |
| wger.de `/api/v2/exerciseinfo` (and related **exercise** endpoints) | Exercises only | CC-BY-SA. Text cues. No photos/video. Do **not** call ingredient or nutritionplan endpoints. |

## Not wired (ideas only if ever used)

Spoonacular and Edamam may suggest ingredient *lists*. They must not land macros in `data/recipes.json`. Those drafts still go through §4.2 USDA.

## Denied (do not scrape)

Allrecipes, NYT Cooking, BBC Good Food, Bodybuilding.com, Tasty, Food Network, Epicurious, Bon Appétit, and any commercial recipe or workout site without written permission. Login, paywall, and CAPTCHA pages are out.

## ScrapeGraphAI

**No HTML scrape URLs are signed off.** `signedOffScrapeUrls` in `tools/ingest/sources.json` is empty. `tools/ingest/scrapegraph_draft.py` refuses unsigned URLs and never writes the catalog. If a government or owner-owned page is approved later, add the exact URL here and to `signedOffScrapeUrls`, emit a **draft ingredient list** only, then USDA-enrich before merge.

## Merge rules

- Recipes: `npm run ingest:recipes` runs the Phase 6 USDA sum/check, then appends. Reviewed catalog slugs (default: already in `data/recipes.json`) are not overwritten.
- Exercises: `npm run ingest:exercises` maps wger `exerciseinfo` JSON. Existing slugs stay. Unmapped patterns (abs, isolation) are skipped.
- PRs are JSON-only. `npm run nutrition:check` must be green. The Next.js client must not import scrapegraphai, USDA, or wger.
