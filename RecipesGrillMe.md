# MyPlate catalog grill (locked)

Grill session for growing `data/recipes.json` from USDA MyPlate Kitchen. **Rounds 1 and 2 are locked. The owner asked for an ingest implementation prompt (20 Aug 2026).** This file is the shared plan.

Not charging money does not unlock Allrecipes, Epicurious, Spoonacular, RecipeNLG, or TheMealDB wholesale. MyPlate Kitchen is a US government recipe set. Macros still follow `docs/domain/recipe-nutrition.md` (USDA FoodData Central at write time).

Related: `docs/content-sources.md`, `docs/domain/content-model.md`, `PRODUCT.md`, `tools/ingest/`, `tools/nutrition/`.

---

## Facts (not owner decisions)

Catalog today: **21** first-party meals — breakfast 5, lunch 6, dinner 7, snack 5. Of those, 17 are vegetarian-capable and 11 are vegan. None of the 21 set `"reviewed": false`, so `mergeRecipes` treats them as reviewed and will not overwrite them.

MyPlate Kitchen: about **1,072** household recipes. USDA published them on `myplate.gov`; that site retired January 2026. There is **no official JSON/CSV/API**. Course counts: main dish 318, side 190, salad 135, soup 107, sauce 99, dessert 81, breakfast 53, bread 43, snack 26, beverage 20. Ingredients are household lines (`1 tablespoon vegetable oil`), not grams. No allergen field. Many pages say “Recipe adapted from …” (extension / SNAP-Ed partners).

`myplate.food` is an independent archive with a JSON API. It is **not USDA**. Free-tier terms forbid mirroring the collection into our own storage. Do not bulk-fetch it.

Internet Archive still has official HTML. Useful starting points:

- Recipe index (Jan 2025): `https://web.archive.org/web/20250124221018/https://www.myplate.gov/myplate-kitchen/recipes`
- Example detail: `https://web.archive.org/web/20250117181741/https://www.myplate.gov/recipes/2-step-chicken`
- CDX (list captures): `https://web.archive.org/cdx/search/cdx?url=www.myplate.gov/recipes/*&output=json&fl=original,timestamp,statuscode&filter=statuscode:200&collapse=urlkey`

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

**Derived (Q2 + Q6 + Q10):** Use soup/salad lunch candidates only if mains cannot fill lunch (including the vegetarian quota). Do not use them as snacks or dinners. Treat “high-protein” as **≥15 g protein per serving** after FDC enrich.

### Q3 — Harvest source

**Locked:** One-time **ingest-time** harvest of **Internet Archive HTML** of official `myplate.gov/recipes/{slug}` pages. Sign off that URL pattern in `docs/content-sources.md` and `tools/ingest/sources.json` before any scrape job.

“Ingest-time” means a Cursor cloud agent, CI, or any machine that runs the script **once**. It does **not** mean the owner must use a personal PC. It does **not** mean the live GitHub Pages site fetches recipes.

Do not bulk-mirror `myplate.food`. Do not call a live recipe API from GitHub Pages.

### Q4 — Macros

**Locked:** Keep write-time **USDA FoodData Central** (`grams` + `fdcId`, `nutrition.source: "usda-fdc"`). Use MyPlate’s on-page nutrition table only as a sanity check, never as committed macros.

**If a MyPlate meal cannot be catalogued because FDC matching is inconsistent** (no honest `fdcId`, checksum fail after a fair match, or MyPlate label and FDC sum disagree beyond a small tolerance): **exchange it** — skip that recipe and take another in-scope recipe from the pool. Do not invent macros. Do not copy the MyPlate calorie row into `data/recipes.json`.

Energy disagreement tolerance vs MyPlate’s on-page kcal: **the larger of 40 kcal or 15% of MyPlate kcal** (aligned with Atwater 40 kcal). If MyPlate has no kcal, skip that check and rely on FDC checksum only.

### Q5 — Merge gate

**Locked:** Drafts in `data/ingest/`. Run `nutrition:check`. Open **one PR** to merge. Owner glances at slot / diet / allergen tags. **Do not overwrite** the current 21 reviewed first-party meals.

---

## Locked Q&A (round 2)

Owner answers 20 Aug 2026. Recommendations accepted as written.

### Q6 — Vegetarian vs meat among new meals

**Locked:** Fill **vegetarian-capable first** until breakfast, lunch, and dinner each have **≥40** vegetarian recipes (counting the existing 21). Remaining slots (the extra ~5 per meal, plus snacks) may be omnivore mains so mixed eaters get meat. Do not starve vegan/vegetarian swaps.

Vegetarian-capable = `dietTags` includes `vegetarian` or `vegan`. Infer from ingredients (no meat, poultry, fish). Vegan = no meat/fish plus no dairy, egg, honey.

### Q7 — Snack shortfall

**Locked:** Take every FDC-ok MyPlate snack. **Dual-tag snack-like breakfasts** (yogurt, fruit, toast, cereal, smoothie). If still short, use leftover first-party snack drafts in `data/ingest/recipe-drafts.json`. Do **not** promote full mains to snack.

### Q8 — Partner “Recipe adapted from …”

**Locked:** **Keep** USDA-published pages that credit an extension office or SNAP-Ed partner. Store USDA + the listed contributor. Drop a row only if the page is clearly not a USDA-published recipe.

### Q9 — Attribution on Today

**Locked:** Show a short line on the recipe disclosure: **USDA MyPlate Kitchen** (plus contributor if present). No photos. `sourceUrl` stays in JSON.

### Q10 — Main dish → lunch vs dinner

**Locked:** **Dual-tag lunch and dinner** until both caps are full. Stop adding to a slot once it hits 45.

When counting caps, a recipe tagged `["lunch","dinner"]` increments **both** slot counts.

### Q11 — FDC exchange pool

**Locked:** Replacement must be the **same course** (breakfast stays breakfast). If that slot’s vegetarian quota is unmet, take the next vegetarian-capable candidate. Never backfill with dessert, sauce, bread, or beverage.

---

## Owner input required to ingest

**Must have**

1. `USDA_FDC_API_KEY` available to the **ingest run** (gitignored `.env` on a PC, a GitHub Actions secret, or a Cursor cloud-agent environment variable). Not `NEXT_PUBLIC_`. The Pages site never sees this key.
2. One-time sign-off of the Wayback / `myplate.gov/recipes/` harvest URLs in `docs/content-sources.md` and `tools/ingest/sources.json` (the implementing agent does this as part of the ingest PR).

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

A **Cursor cloud agent** (browser workflow) copies **archived public HTML** onto the agent’s temporary disk, turns it into JSON in the **same run**, and commits only that JSON to GitHub. The HTML does not need to live in the repo. The owner does not need a PC.

### Methods considered

| Method | Verdict |
| --- | --- |
| Open myplate.gov in a browser and rewrite pages | Impossible (site gone) and not ours to edit |
| Live scrape from the deployed app | Forbidden by product rules; Pages has no server scrape |
| Bulk-download `myplate.food` JSON API | Rejected (Q3). Independent site; free tier forbids mirroring into our storage |
| ScrapeGraphAI / an LLM “reading” each HTML page | Allowed only after URL sign-off, but non-deterministic and heavier than we need. **Not the default.** |
| Internet Archive HTML + deterministic HTML parse | **Chosen (Q3).** Official USDA text, public domain, repeatable |

### Chosen pipeline

1. **Allowlist.** Add MyPlate Kitchen via Internet Archive to `docs/content-sources.md`. Extend `tools/ingest/sources.json` so Wayback URLs for `https://www.myplate.gov/recipes/…` (and `web.archive.org` captures of those paths) are signed off. Today `signedOffScrapeUrls` is empty and exact-match only — add **prefix** support so we do not list 1,000 URLs by hand.
2. **Discover slugs.** Archived index and/or CDX. Keep breakfast, snack, main dish. Soup/salad only as lunch fallback. Drop dessert, sauce, bread, beverage.
3. **Fetch HTML** on the agent VM, rate-limited (~1 request / 2–3 s). Gitignored temp dir. Never commit HTML. Never fetch from the Next.js app.
4. **Parse** deterministically (JSON-LD / Drupal markup). Not an LLM rewrite. Optional `data/ingest/myplate-raw.json`.
5. **Normalize** to grams + `fdcId`, infer tags, assign slots per Q6–Q11.
6. **Enrich and exchange** with existing `tools/nutrition`.
7. **Stop** at 45 / 45 / 45 / 30 including the 21.
8. **Merge PR** + Today attribution. Client must not import scrapegraphai, USDA, or wger.

### What goes to GitHub vs what dies with the agent VM

| Artifact | Where |
| --- | --- |
| Wayback HTML | Agent temp disk only. **Not** GitHub. Discarded when the run ends. |
| `data/ingest/myplate-raw.json` (parsed lines) | GitHub, optional / reviewable |
| Normalized drafts with grams + `fdcId` | GitHub (`data/ingest/`) |
| FDC cache hits | GitHub (`data/nutrition/fdc-cache.json`) |
| Merged `data/recipes.json` | GitHub, after check |
| Live fetches from the Pages site | Never |

---

## Implementation catalogue (for the ingest agent)

### Caps (including the existing 21)

| Slot | Target listings | Vegetarian-capable minimum |
| --- | --- | --- |
| breakfast | 45 | 40 |
| lunch | 45 | 40 |
| dinner | 45 | 40 |
| snack | 30 | no extra veg quota |

A dual-tagged recipe counts toward every slot it lists.

### Fill order

1. Vegetarian-capable breakfasts until breakfast veg ≥ 40.
2. Vegetarian-capable mains as `["lunch","dinner"]` until lunch veg ≥ 40 and dinner veg ≥ 40 (stop adding a slot to a recipe once that slot is at 45).
3. Remaining breakfast / lunch / dinner listings up to 45 with omnivore mains if needed.
4. All FDC-ok MyPlate snacks, then snack-like breakfasts dual-tagged `snack`, then first-party snack drafts.
5. High-protein soup/salad (`≥15 g` protein / serving) as **lunch only** if lunch still short.
6. Stop. Do not import the rest of MyPlate.

### Existing code to reuse

| Path | Role |
| --- | --- |
| `tools/ingest/sources.json` + `sources.ts` | Allow/deny hosts. Extend scrape sign-off with prefixes. |
| `tools/ingest/recipes.ts` | `enrichDraftWithUsda`, `mergeRecipes` (skips reviewed slugs). |
| `tools/ingest/merge-recipes.ts` | `npm run ingest:recipes` reads `data/ingest/recipe-drafts.json`. |
| `tools/nutrition/sum.ts` | FDC grams → macros, Atwater ±40 kcal. |
| `tools/nutrition/enrich.ts` | Cache-miss FDC fetch with `USDA_FDC_API_KEY`. |
| `tools/nutrition/search.ts` | FDC search (SR Legacy / Foundation). |
| `tools/nutrition/check.ts` | `npm run nutrition:check`. |
| `data/recipes.json` | Catalog. 21 first-party rows. `nutrition.source` must stay `usda-fdc`. |
| `data/ingest/recipe-drafts.json` | Leftover first-party drafts (snack backup). |
| `src/catalog/recipes.ts` | Maps JSON → `CatalogRecipe`. Must pass attribution fields through. |
| `src/engine/meals.ts` | `CatalogRecipe` type. |
| `src/components/meals/meal-card.tsx` | Recipe disclosure — add Q9 credit line. |
| `src/components/today/today-screen.tsx` | Passes recipe into `MealCard`. |

### JSON shape for new rows

Match existing catalog rows. Required:

- `slug`, `title`, `slots`, `dietTags`, `allergens`, `kitchenTags`, `cookMinutes`, `servings`, `equipment`, `steps[]`
- `ingredients[]`: `name`, `grams`, `household`, `fdcId`, `matchNote`
- `nutrition`: `kcal`, `proteinG`, `carbG`, `fatG`, `source: "usda-fdc"`, `computedAt`, `checksumOk: true`
- `sourceKind: "myplate-kitchen"`
- `license: "us-government-work"`
- `sourceUrl`: the Wayback URL actually fetched
- `sourceAttribution`: e.g. `"USDA MyPlate Kitchen"` plus contributor if present
- Do **not** set `"reviewed": false` on the original 21. New MyPlate rows may omit `reviewed` or set it true after the PR glance.

### Allowlist change

- Add `web.archive.org` harvest of `myplate.gov/recipes/` (and the archived kitchen index) to `docs/content-sources.md` Allowed table.
- Add `signedOffScrapeUrlPrefixes` (or equivalent prefix match) in `sources.json` / `sources.ts` for:
  - `https://web.archive.org/web/` captures whose original path is `/recipes/` or `/myplate-kitchen/` on `myplate.gov`
  - optionally the original `https://www.myplate.gov/recipes/` host (pages are dead; fetch Wayback, not live 403s)
- Keep commercial hosts in `deniedHosts`.
- `assertScrapeAllowed` must accept prefix matches. Update `tools/ingest/sources.test.ts`.
- Do not add `myplate.food` to allowed API hosts.

### UI (Q9)

For `sourceKind === "myplate-kitchen"`, inside the Recipe `<details>` on `MealCard`, show one line: `USDA MyPlate Kitchen` and contributor if `sourceAttribution` has more. Optional: `sourceUrl` as a text link. No images.

### Tests (keep)

- Prefix allowlist accepts Wayback MyPlate recipe URLs; still denies Allrecipes.
- Parser fixture: canned HTML (small, committed under `tools/ingest/fixtures/`) → title, ingredients, steps, course.
- Household → grams for a known line (`1 tablespoon olive oil` ≈ 14 g).
- Slot assignment: main → lunch+dinner until cap; snack-like breakfast also snack; dessert course rejected.
- Exchange: failed FDC match skipped; next same-course veg candidate used when veg quota unmet.
- `mergeRecipes` still skips existing first-party slugs.
- MealCard shows the MyPlate credit when attribution is passed.
- `npm test`, `npm run nutrition:check`, `npm run typecheck`. Next.js client must not import `tools/`, USDA URLs, or scrapegraphai.

### Git / cloud agent

- Branch: `cursor/myplate-ingest-9a49` from `main` (include this file if it is not on `main` yet).
- Do not commit `.env`, HTML caches, or `USDA_FDC_API_KEY`.
- Add `.cache/` or `/tmp` MyPlate HTML to `.gitignore` if the tool writes inside the repo.
- Commit, push, open/update PR with `ManagePullRequest` (`base_branch: main`).
- If `USDA_FDC_API_KEY` is missing: ship parser + allowlist + tests on fixtures, do **not** invent macros, and stop before claiming the catalog hit 45/45/45/30. Request the key rather than copying MyPlate calorie tables.

### Hard bans

- No myplate.food bulk/API mirror.
- No Spoonacular, RecipeNLG, Epicurious, Allrecipes, BBC, TheMealDB wholesale.
- No live scrape from Pages.
- No photos.
- No NextAuth, no `service_role` in the client.

---

## Agent prompt (paste into a new Cursor Web agent)

```text
Implement the MyPlate Kitchen ingest for BodyPlan. Follow RecipesGrillMe.md as the locked plan. Do not reopen Q1–Q11.

Goal: keep the current 21 first-party meals in data/recipes.json. Grow slot coverage to 45 breakfast / 45 lunch / 45 dinner / 30 snack. Fill vegetarian-capable first until breakfast, lunch, and dinner each have ≥40 vegetarian (or vegan) recipes including those 21. Then fill remaining listings with omnivore mains. Stop. Do not import all ~1072 MyPlate recipes.

How to get the recipes (Cursor Web is enough; no owner laptop, no C: drive):
1. Sign off Internet Archive captures of official myplate.gov/recipes/* (and the kitchen index) in docs/content-sources.md and tools/ingest/sources.json. Add prefix matching in sources.ts — signedOffScrapeUrls is exact-match and empty today. Do not allow myplate.food.
2. Discover slugs from the archived index and/or Wayback CDX. Keep USDA courses breakfast, snack, main dish. Drop dessert, sauce, bread, beverage. High-protein soup/salad (≥15 g protein/serving after FDC) as lunch only if lunch is still short.
3. Fetch Wayback HTML onto the agent temp disk (rate-limit 2–3 s). Gitignore it. Do not commit HTML. Do not fetch from the Next.js app. Prefer late-2024/Jan 2026 snapshots. Example index: https://web.archive.org/web/20250124221018/https://www.myplate.gov/myplate-kitchen/recipes
4. Parse HTML deterministically (JSON-LD / Drupal recipe markup), not ScrapeGraph, not an LLM rewrite of the method.
5. Convert household measures to grams. Map each ingredient to an FDC fdcId (Foundation/SR Legacy) via tools/nutrition. Infer allergens and vegetarian/vegan. Dual-tag mains lunch+dinner until each slot hits 45. Dual-tag snack-like breakfasts (yogurt, fruit, toast, cereal, smoothie) as snack. Keep partner “adapted from” lines as contributor text.
6. Enrich with existing tools/nutrition so nutrition.source is usda-fdc. Use MyPlate’s on-page kcal only as a check (fail if off by more than max(40 kcal, 15% of MyPlate kcal)). If FDC match is dishonest, checksum fails, or that check fails: exchange — skip and take the next same-course recipe; if that slot’s veg quota is unmet, prefer the next vegetarian-capable candidate. Never invent macros. Never copy MyPlate calorie rows into the catalog.
7. Snacks: FDC-ok MyPlate snacks, then dual-tagged breakfasts, then leftover drafts in data/ingest/recipe-drafts.json. Never promote mains to snack.
8. Merge with npm run ingest:recipes / mergeRecipes so the original 21 are not overwritten. npm run nutrition:check must pass.
9. Show “USDA MyPlate Kitchen” (plus contributor) on the Today MealCard recipe disclosure for those rows. No photos. Pass sourceKind/sourceAttribution/sourceUrl through src/catalog/recipes.ts and CatalogRecipe.
10. Tests as listed in RecipesGrillMe.md Implementation catalogue. npm test, nutrition:check, typecheck green.

Git: branch cursor/myplate-ingest-9a49 from main (bring RecipesGrillMe.md along if it is not merged). Commit and push as you go. PR via ManagePullRequest, base_branch main. Never commit USDA_FDC_API_KEY.

If USDA_FDC_API_KEY is missing in this agent environment: implement allowlist, parser, fixtures, slot/exchange logic, and UI attribution; do not write fake usda-fdc macros; do not claim caps are met; ask for the key to run the live harvest.

Hard bans: myplate.food bulk, Spoonacular, RecipeNLG, Epicurious/Allrecipes/BBC scrapes, TheMealDB dump, live Pages scrape, photos, NextAuth, service_role in the client, USDA/wger/scrapegraphai imported from src/.
```

---

## Status

| Round | Status |
| --- | --- |
| 1 (Q1–Q5) | **Locked** 20 Aug 2026 |
| 2 (Q6–Q11) | **Locked** 20 Aug 2026 |
| Harvest method | Wayback HTML + deterministic parse on a **Cursor cloud agent**. HTML on agent disk only; JSON to GitHub. |
| Implementation catalogue + agent prompt | **Written** 20 Aug 2026 |
| Ingest implementation | Next agent run, using the prompt above |
