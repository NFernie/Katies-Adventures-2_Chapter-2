# MyPlate catalog grill (locked)

Grill session for growing `data/recipes.json` from USDA MyPlate Kitchen. **Round 1 is locked. Ingest is not built until the remaining questions below are answered and the owner confirms shared understanding.**

Not charging money does not unlock Allrecipes, Epicurious, Spoonacular, RecipeNLG, or TheMealDB wholesale. MyPlate Kitchen is a US government recipe set. Macros still follow `docs/domain/recipe-nutrition.md` (USDA FoodData Central at write time).

Related: `docs/content-sources.md`, `docs/domain/content-model.md`, `PRODUCT.md` (minimum catalog ~40 / 40 / 40 / 25 with vegetarian coverage), `tools/ingest/`.

---

## Facts (not owner decisions)

Catalog today: **21** first-party meals — breakfast 5, lunch 6, dinner 7, snack 5. Of those, 17 are vegetarian-capable and 11 are vegan.

MyPlate Kitchen: about **1,072** household recipes. USDA published them on `myplate.gov`; that site retired January 2026. There is **no official JSON/CSV/API**. Course counts (third-party index of the same library): main dish 318, side 190, salad 135, soup 107, sauce 99, dessert 81, breakfast 53, bread 43, snack 26, beverage 20. Ingredients are household lines (`1 tablespoon vegetable oil`), not grams. No allergen field. Many pages say “Recipe adapted from …” (extension / SNAP-Ed partners).

`myplate.food` is an independent archive with a JSON API. It is **not USDA**. Free-tier terms forbid mirroring the collection into our own storage. Do not bulk-fetch it.

Internet Archive still has official HTML, e.g. `https://web.archive.org/web/*/https://www.myplate.gov/recipes/{slug}`.

Spoonacular and similar APIs may not store ingredients, steps, or nutrition in git. They are out.

---

## Locked Q&A (round 1)

Owner answers 20 Aug 2026. Recommendations accepted as written.

### Q1 — Stop condition (how many)

**Locked:** Keep the current **21**. Grow slot coverage to **45 breakfast / 45 lunch / 45 dinner / 30 snack**, then stop. Do not import the whole ~1,072.

Net new slot listings vs today: about **+40 breakfast, +39 lunch, +38 dinner, +25 snack**. Unique recipe count will be lower if some meals occupy two slots (open in round 2).

Snack is the tight course: MyPlate only tags **26** snacks. Hitting 30 snack listings will need a mapping rule (round 2) or first-party snack drafts if MyPlate snacks fail FDC.

### Q2 — Which MyPlate courses

**Locked:** **Breakfast, snack, and main dish.** Map mains toward lunch and/or dinner. Optionally keep **high-protein soups and salads as lunch**. Drop dessert, sauce, bread, and beverage so those do not land in planner swaps.

### Q3 — Harvest source

**Locked:** One-time laptop harvest of **Internet Archive HTML** of official `myplate.gov/recipes/{slug}` pages. Sign off that URL pattern in `docs/content-sources.md` and `tools/ingest/sources.json` before any scrape job.

Do not bulk-mirror `myplate.food`. Do not call a live recipe API from GitHub Pages.

### Q4 — Macros

**Locked:** Keep write-time **USDA FoodData Central** (`grams` + `fdcId`, `nutrition.source: "usda-fdc"`). Use MyPlate’s on-page nutrition table only as a sanity check, never as committed macros.

**If a MyPlate meal cannot be catalogued because FDC matching is inconsistent** (no honest `fdcId`, checksum fail after a fair match, or MyPlate label and FDC sum disagree beyond a small tolerance): **exchange it** — skip that recipe and take another in-scope recipe from the pool. Do not invent macros. Do not copy the MyPlate calorie row into `data/recipes.json`.

### Q5 — Merge gate

**Locked:** Drafts in `data/ingest/`. Run `nutrition:check`. Open **one PR** to merge. Owner glances at slot / diet / allergen tags. **Do not overwrite** the current 21 reviewed first-party meals.

---

## Owner input required to ingest

**Must have**

1. `USDA_FDC_API_KEY` in gitignored `.env` and the GitHub Actions secret (same as today’s enrich). Not `NEXT_PUBLIC_`.
2. One-time sign-off of the Wayback / `myplate.gov/recipes/` harvest URLs in `docs/content-sources.md` and `tools/ingest/sources.json`.

**Not required**

- MyPlate login, USDA recipe API key, Spoonacular key, or payment.
- Writing the method text (federal page directions are in-scope).
- Photos (v1 has none).

**After the machine pass (Q5)**

- Glance at inferred slots, diet tags, and allergens on the PR.
- Confirm or reject shaky `fdcId` / gram conversions; those rows are exchanged, not faked.

---

## Process / plan (round 1)

Do not run this until round 2 is locked and the owner says the tree is done.

1. **Allowlist.** Record MyPlate Kitchen via Internet Archive as an allowed HTML harvest in `docs/content-sources.md`. Extend scrape sign-off so Wayback URLs for `myplate.gov/recipes/*` are allowed (today `signedOffScrapeUrls` is an empty exact-match list).
2. **Discover slugs.** From an archived MyPlate Kitchen index (~1,091 URLs), keep recipes whose USDA course is breakfast, snack, or main dish. Optionally queue high-protein soup/salad as lunch candidates. Drop dessert, sauce, bread, beverage.
3. **Fetch.** Laptop only. Archived HTML for each kept slug. Rate-limit Archive.org. Never scrape on page view. Never call MyPlate from the Next.js bundle.
4. **Parse to drafts.** Title, steps, servings, household ingredient lines, cook time when present, contributor line, archived `sourceUrl`, `sourceKind: "myplate-kitchen"`, `license: "us-government-work"`. No photos.
5. **Normalize.** Convert household measures to grams. Map each ingredient to an FDC `fdcId` (prefer Foundation / SR Legacy). Infer `allergens` and `dietTags` from ingredients. Assign `slots` per the round-2 lunch/dinner rule. Do not copy MyPlate kcal into `nutrition`.
6. **Enrich.** `tools/nutrition` sum → `nutrition.source: "usda-fdc"`. Compare to MyPlate’s table as a check only.
7. **Exchange.** If FDC match is dishonest, checksum fails, or MyPlate vs FDC disagree beyond tolerance: drop that slug and take the next in-scope recipe. Repeat until slot caps are met or the pool is exhausted.
8. **Caps.** Stop when catalog slot coverage is **≥45 breakfast, ≥45 lunch, ≥45 dinner, ≥30 snack**, counting the existing 21. Do not backfill past those caps.
9. **Merge.** `npm run nutrition:check` must pass. `npm run ingest:recipes` appends only. Reviewed first-party slugs stay. One JSON PR. Client still must not import scrapegraphai, USDA, or wger.

Out of scope unless a later grill round changes it: Wikibooks, TheMealDB, Spoonacular, Epicurious/Kaggle, RecipeNLG, live recipe APIs, user-writable public catalog, progress or food photos, committing MyPlate nutrition labels as USDA.

---

## Still open (round 2 — do not assume)

These hang off Q1–Q5. They are not locked.

| ID | Topic | Why it is still open |
| --- | --- | --- |
| Q6 | Vegetarian vs omnivore mix among the new meals | Product minimum asks for vegetarian coverage of ~40 per main slot. The 21 are already mostly vegetarian. Filling 45 dinners with chicken would leave vegan users on ~11 meals. |
| Q7 | Snack shortfall | Need ~30 snack listings; MyPlate tags 26 snacks. Promote sides/salads, dual-tag some breakfasts, or keep writing first-party snacks when MyPlate snacks fail FDC. |
| Q8 | Partner “adapted from” recipes | Keep with USDA + contributor credit, or skip and take only pages with no partner line. |
| Q9 | Attribution in the UI | Show “USDA MyPlate Kitchen” (and contributor) on the Today recipe disclosure, or only store `sourceUrl` in JSON for agents/PRs. |
| Q10 | Main dish → lunch vs dinner | Dual-tag every main as lunch+dinner until both caps fill; or split by kcal/protein; or fill dinner first. |
| Q11 | Exchange pool | When FDC rejects a recipe, the replacement must match course (and diet tag if Q6 sets a quota), not a random dessert. |

---

## Status

| Round | Status |
| --- | --- |
| 1 (Q1–Q5) | **Locked** 20 Aug 2026 |
| 2 (Q6–Q11) | Open — ask in chat, then append answers here |
| Ingest implementation | **Not started** until the owner confirms the tree is done |
