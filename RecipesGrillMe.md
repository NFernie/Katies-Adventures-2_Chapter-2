# MyPlate catalog grill (locked)

Grill session for growing `data/recipes.json` from USDA MyPlate Kitchen. **Rounds 1 and 2 are locked.** Ingest code waits until the owner confirms this document is the shared plan.

Not charging money does not unlock Allrecipes, Epicurious, Spoonacular, RecipeNLG, or TheMealDB wholesale. MyPlate Kitchen is a US government recipe set. Macros still follow `docs/domain/recipe-nutrition.md` (USDA FoodData Central at write time).

Related: `docs/content-sources.md`, `docs/domain/content-model.md`, `PRODUCT.md` (minimum catalog ~40 / 40 / 40 / 25 with vegetarian coverage), `tools/ingest/`.

---

## Facts (not owner decisions)

Catalog today: **21** first-party meals — breakfast 5, lunch 6, dinner 7, snack 5. Of those, 17 are vegetarian-capable and 11 are vegan.

MyPlate Kitchen: about **1,072** household recipes. USDA published them on `myplate.gov`; that site retired January 2026. There is **no official JSON/CSV/API**. Course counts (index of the same library): main dish 318, side 190, salad 135, soup 107, sauce 99, dessert 81, breakfast 53, bread 43, snack 26, beverage 20. Ingredients are household lines (`1 tablespoon vegetable oil`), not grams. No allergen field. Many pages say “Recipe adapted from …” (extension / SNAP-Ed partners).

`myplate.food` is an independent archive with a JSON API. It is **not USDA**. Free-tier terms forbid mirroring the collection into our own storage. Do not bulk-fetch it.

Internet Archive still has official HTML, e.g. `https://web.archive.org/web/*/https://www.myplate.gov/recipes/{slug}`.

Spoonacular and similar APIs may not store ingredients, steps, or nutrition in git. They are out.

`tools/nutrition` 4-4-9 checksum tolerance is **40 kcal** (`ATWATER_TOLERANCE_KCAL`).

---

## Locked Q&A (round 1)

Owner answers 20 Aug 2026. Recommendations accepted as written.

### Q1 — Stop condition (how many)

**Locked:** Keep the current **21**. Grow slot coverage to **45 breakfast / 45 lunch / 45 dinner / 30 snack**, then stop. Do not import the whole ~1,072.

Net new slot listings vs today: about **+40 breakfast, +39 lunch, +38 dinner, +25 snack**. Unique mains are lower because Q10 dual-tags lunch+dinner.

### Q2 — Which MyPlate courses

**Locked:** **Breakfast, snack, and main dish.** Map mains toward lunch and/or dinner. Optionally keep **high-protein soups and salads as lunch**. Drop dessert, sauce, bread, and beverage so those do not land in planner swaps.

**Derived (Q2 + Q6 + Q10):** Use soup/salad lunch candidates only if mains cannot fill lunch (including the vegetarian quota). Do not use them as snacks or dinners.

### Q3 — Harvest source

**Locked:** One-time **ingest-time** harvest of **Internet Archive HTML** of official `myplate.gov/recipes/{slug}` pages. Sign off that URL pattern in `docs/content-sources.md` and `tools/ingest/sources.json` before any scrape job.

“Ingest-time” means a Cursor cloud agent, CI, or any machine that runs the script **once**. It does **not** mean the owner must use a personal PC. It does **not** mean the live GitHub Pages site fetches recipes.

Do not bulk-mirror `myplate.food`. Do not call a live recipe API from GitHub Pages.

### Q4 — Macros

**Locked:** Keep write-time **USDA FoodData Central** (`grams` + `fdcId`, `nutrition.source: "usda-fdc"`). Use MyPlate’s on-page nutrition table only as a sanity check, never as committed macros.

**If a MyPlate meal cannot be catalogued because FDC matching is inconsistent** (no honest `fdcId`, checksum fail after a fair match, or MyPlate label and FDC sum disagree beyond a small tolerance): **exchange it** — skip that recipe and take another in-scope recipe from the pool. Do not invent macros. Do not copy the MyPlate calorie row into `data/recipes.json`.

### Q5 — Merge gate

**Locked:** Drafts in `data/ingest/`. Run `nutrition:check`. Open **one PR** to merge. Owner glances at slot / diet / allergen tags. **Do not overwrite** the current 21 reviewed first-party meals.

---

## Locked Q&A (round 2)

Owner answers 20 Aug 2026. Recommendations accepted as written.

### Q6 — Vegetarian vs meat among new meals

**Locked:** Fill **vegetarian-capable first** until breakfast, lunch, and dinner each have **≥40** vegetarian recipes (counting the existing 21). Remaining slots (the extra ~5 per meal, plus snacks) may be omnivore mains so mixed eaters get meat. Do not starve vegan/vegetarian swaps.

### Q7 — Snack shortfall

**Locked:** Take every FDC-ok MyPlate snack. **Dual-tag snack-like breakfasts** (yogurt, fruit, toast). If still short, use leftover first-party snack drafts. Do **not** promote full mains to snack.

### Q8 — Partner “Recipe adapted from …”

**Locked:** **Keep** USDA-published pages that credit an extension office or SNAP-Ed partner. Store USDA + the listed contributor. Drop a row only if the page is clearly not a USDA-published recipe.

### Q9 — Attribution on Today

**Locked:** Show a short line on the recipe disclosure: **USDA MyPlate Kitchen** (plus contributor if present). No photos. `sourceUrl` stays in JSON.

### Q10 — Main dish → lunch vs dinner

**Locked:** **Dual-tag lunch and dinner** until both caps are full. Stop adding to a slot once it hits 45.

### Q11 — FDC exchange pool

**Locked:** Replacement must be the **same course** (breakfast stays breakfast). If that slot’s vegetarian quota is unmet, take the next vegetarian-capable candidate. Never backfill with dessert, sauce, bread, or beverage.

---

## Owner input required to ingest

**Must have**

1. `USDA_FDC_API_KEY` in gitignored `.env` and the GitHub Actions secret (same as today’s enrich). Not `NEXT_PUBLIC_`.
2. One-time sign-off of the Wayback / `myplate.gov/recipes/` harvest URLs in `docs/content-sources.md` and `tools/ingest/sources.json`.

**Not required**

- MyPlate login, USDA recipe API key, Spoonacular key, or payment.
- Writing the method text (federal page directions are in-scope).
- Photos (v1 has none).
- Access to myplate.gov (the live kitchen is gone; we use Archive.org).
- A personal laptop or `C:` drive. Cursor Web is enough. HTML is fetched on the agent VM, parsed in that same run, and discarded. Only JSON is committed to GitHub.

**After the machine pass (Q5)**

- Glance at inferred slots, diet tags, and allergens on the PR.
- Confirm or reject shaky `fdcId` / gram conversions; those rows are exchanged, not faked.

---

## How data is gathered (not rewriting the website)

We do **not** log into MyPlate, edit USDA pages, or “read and rewrite” recipes on a live site. `myplate.gov`’s kitchen is retired. GitHub Pages never fetches recipes at view time.

A **Cursor cloud agent** (this browser workflow) copies **archived public HTML** onto the agent’s temporary disk, turns it into JSON in the **same run**, and commits only that JSON to GitHub. The HTML does not need to live in the repo. The owner does not need a PC.

### Methods considered

| Method | Verdict |
| --- | --- |
| Open myplate.gov in a browser and rewrite pages | Impossible (site gone) and not ours to edit |
| Live scrape from the deployed app | Forbidden by product rules; Pages has no server scrape |
| Bulk-download `myplate.food` JSON API | Rejected (Q3). Independent site; free tier forbids mirroring into our storage |
| ScrapeGraphAI / an LLM “reading” each HTML page | Allowed only after URL sign-off, but non-deterministic and heavier than we need. **Not the default.** |
| Internet Archive HTML + deterministic HTML parse | **Chosen (Q3).** Official USDA text, public domain, repeatable |

### Chosen pipeline

1. **Allowlist.** Add MyPlate Kitchen via Internet Archive to `docs/content-sources.md`. Extend `tools/ingest/sources.json` so Wayback URLs for `https://www.myplate.gov/recipes/…` (and `web.archive.org` captures of those paths) are signed off. Today `signedOffScrapeUrls` is empty and exact-match only.

2. **Discover slugs (no full recipe body yet).** Use an archived MyPlate Kitchen index (Wayback capture of the recipe list, ~1,091 links) and/or the Internet Archive CDX API to list captures whose original URL is `https://www.myplate.gov/recipes/{slug}`. Keep slugs whose USDA **course** is breakfast, snack, or main dish. Queue high-protein soup/salad only as lunch fallback (see Q2 derived rule). Drop dessert, sauce, bread, beverage.

3. **Fetch HTML (agent VM, rate-limited).** For each kept slug, request one Wayback snapshot, e.g. `https://web.archive.org/web/20250117181741/https://www.myplate.gov/recipes/{slug}`. Prefer a late-2024 / Jan 2026 capture (last good USDA HTML). Pause between requests so Archive.org is not hammered. Write raw HTML under a **gitignored** temp dir on the agent (`/tmp` or `.cache/`, never `data/`). Do not commit megabytes of Wayback HTML to GitHub. Do not fetch from the Next.js app when a user opens Today. When the agent run ends, that disk goes away — which is fine, because the parsed JSON is already in the PR.

4. **Parse (deterministic).** Read the HTML file. Pull title, course, servings, ingredient lines, numbered directions, cook time if present, contributor / “adapted from” line, and the on-page nutrition table (check only). Prefer Schema.org JSON-LD on the page when it has those fields; fall back to the Drupal recipe markup. A dedicated parser in `tools/ingest/` (same idea as the open-source `recipe-scrapers` MyPlate extractor) — **not** an LLM rewriting the method. Output `data/ingest/myplate-raw.json` (structured lines, still household measures, still no `fdcId`).

5. **Normalize to BodyPlan drafts.** For each raw row:
   - Convert cups/tablespoons/ounces to **grams** with a household table.
   - Map each ingredient to an FDC `fdcId` (Foundation / SR Legacy first) via `tools/nutrition` search + cache. `USDA_FDC_API_KEY` is used here only, on the agent/CI, never as `NEXT_PUBLIC_` in the Pages app.
   - Infer `allergens` and `dietTags` (vegetarian/vegan) from ingredients.
   - Assign `slots`: breakfast course → `breakfast`; snack course → `snack`; snack-like breakfasts also get `snack` (Q7); main dish → `["lunch","dinner"]` until a slot hits 45 (Q10).
   - Set `sourceKind: "myplate-kitchen"`, `license: "us-government-work"`, `sourceUrl` to the archived page. No photos.
   - Do **not** copy MyPlate kcal into `nutrition`.

6. **Enrich and exchange.** Run the Phase 6 summer so `nutrition.source` is `usda-fdc` and the 4-4-9 checksum is within 40 kcal. Compare FDC sums to MyPlate’s table as a sanity check. If matching is dishonest, checksum fails, or the two energy numbers disagree beyond tolerance: **drop that slug** and take the next same-course candidate; if the vegetarian quota for that slot is unmet, prefer the next vegetarian-capable candidate (Q4, Q11).

7. **Fill order.** Vegetarian-capable breakfast / lunch / dinner first until each slot has ≥40 vegetarian recipes including the 21 (Q6). Then omnivore mains for the remaining ~5 per slot. Snacks: all FDC-ok MyPlate snacks, then dual-tagged breakfasts, then first-party snack drafts (Q7). Soup/salad only if lunch still short. Stop at **45 / 45 / 45 / 30**.

8. **Merge PR.** `npm run nutrition:check` must pass. `npm run ingest:recipes` appends drafts; reviewed first-party slugs are not overwritten. One JSON PR plus the Today attribution line (Q9). The client must not import scrapegraphai, USDA, or wger.

### What goes to GitHub vs what dies with the agent VM

Cursor Web **does** have a filesystem — it is the cloud agent’s disk, not your `C:` drive. GitHub is only for the **results**.

| Artifact | Where |
| --- | --- |
| Wayback HTML | Agent temp disk only. **Not** GitHub. Discarded when the run ends. |
| `data/ingest/myplate-raw.json` (parsed lines) | GitHub, optional / reviewable |
| Normalized drafts with grams + `fdcId` | GitHub (`data/ingest/`) |
| FDC cache hits | GitHub (`data/nutrition/fdc-cache.json`) |
| Merged `data/recipes.json` | GitHub, after check |
| Live fetches from the Pages site | Never |

You can re-download any page later from the `sourceUrl` (Wayback link) stored on each recipe. That is why the HTML itself does not need to be in the repo.

---

## Process / plan (execution order)

Do not run until the owner confirms this file is the shared plan.

1. Sign off Wayback + `myplate.gov/recipes/` in content-sources and `sources.json` (prefix or pattern, not 1,000 exact URLs by hand).
2. Discover in-scope slugs from the archived index / CDX.
3. Fetch and parse as above.
4. Normalize, enrich, exchange, cap.
5. Show USDA MyPlate Kitchen (and contributor) on the Today recipe disclosure for those rows.
6. One PR: JSON catalog + attribution UI. Owner glances at tags.

Out of scope unless a later grill round changes it: Wikibooks, TheMealDB, Spoonacular, Epicurious/Kaggle, RecipeNLG, live recipe APIs, user-writable public catalog, progress or food photos, committing MyPlate nutrition labels as USDA, ScrapeGraphAI as the default parser.

---

## Status

| Round | Status |
| --- | --- |
| 1 (Q1–Q5) | **Locked** 20 Aug 2026 |
| 2 (Q6–Q11) | **Locked** 20 Aug 2026 |
| Harvest method | Wayback HTML + deterministic parse on a **Cursor cloud agent** (or CI). HTML stays on the agent disk; only JSON is committed. Not the owner’s PC, not live site edits, not myplate.food bulk. |
| Ingest implementation | **Not started** until the owner confirms the tree is done |
