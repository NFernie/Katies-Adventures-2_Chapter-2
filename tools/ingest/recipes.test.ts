import assert from "node:assert/strict";
import test from "node:test";

import type { FdcCache } from "../nutrition/types.ts";
import { enrichDraftWithUsda, mergeRecipes, type CatalogRecipeRow, type IngestRecipeDraft } from "./recipes.ts";

const cache: FdcCache = {
  version: 1,
  foods: {
    "170894": {
      fdcId: 170894,
      description: "Yogurt",
      dataType: "SR Legacy",
      fetchedAt: "2026-08-18T00:00:00Z",
      per100g: { kcal: 59, proteinG: 10.3, carbG: 3.6, fatG: 0.4 },
    },
  },
};

const draft = {
  slug: "yogurt-cup-draft",
  title: "Yogurt cup",
  slots: ["snack"],
  dietTags: ["vegetarian"],
  allergens: ["dairy"],
  kitchenTags: [],
  cookMinutes: 2,
  servings: 1,
  equipment: ["none"],
  steps: ["Spoon yogurt into a cup."],
  ingredients: [
    { name: "Greek yogurt, plain, nonfat", grams: 200, fdcId: 170894 },
  ],
  nutrition: {
    kcal: 999,
    proteinG: 99,
    carbG: 99,
    fatG: 99,
    source: "spoonacular",
  },
};

test("enrichDraftWithUsda overwrites foreign macros with the USDA cache sum", () => {
  const row = enrichDraftWithUsda(draft, cache, "2026-08-19T00:00:00Z");
  assert.equal(row.nutrition.source, "usda-fdc");
  assert.equal(row.nutrition.kcal, 118);
  assert.equal(row.nutrition.proteinG, 20.6);
  assert.equal(row.nutrition.carbG, 7.2);
  assert.equal(row.nutrition.fatG, 0.8);
  assert.equal(row.nutrition.checksumOk, true);
});

test("enrichDraftWithUsda refuses a draft with no fdcId", () => {
  assert.throws(
    () =>
      enrichDraftWithUsda(
        {
          ...draft,
          ingredients: [{ name: "mystery", grams: 100, fdcId: 0 }],
        },
        cache,
      ),
    /missing fdcId|cache miss/i,
  );
});

test("mergeRecipes skips a reviewed catalog slug", () => {
  const existing: CatalogRecipeRow[] = [
    enrichDraftWithUsda({ ...draft, slug: "kept-yogurt", reviewed: true }, cache),
  ];
  const result = mergeRecipes(
    existing,
    [{ ...draft, slug: "kept-yogurt", title: "Should not land" }],
    cache,
  );
  assert.deepEqual(result.skipped, ["kept-yogurt"]);
  assert.deepEqual(result.added, []);
  assert.equal(result.recipes[0]?.title, "Yogurt cup");
});

test("mergeRecipes appends a new USDA-checked slug", () => {
  const existing: CatalogRecipeRow[] = [];
  const result = mergeRecipes(existing, [draft], cache);
  assert.deepEqual(result.added, ["yogurt-cup-draft"]);
  assert.equal(result.recipes[0]?.nutrition.source, "usda-fdc");
});

test("first-party ingest drafts enrich against the committed FDC cache", async () => {
  const { readFileSync } = await import("node:fs");
  const { readCache } = await import("../nutrition/cache.ts");
  const drafts = JSON.parse(
    readFileSync(new URL("../../data/ingest/recipe-drafts.json", import.meta.url), "utf8"),
  ) as IngestRecipeDraft[];
  const committed = readCache();
  assert.ok(drafts.length > 0);
  for (const row of drafts) {
    const enriched = enrichDraftWithUsda(row, committed);
    assert.equal(enriched.nutrition.source, "usda-fdc");
    assert.equal(enriched.nutrition.checksumOk, true);
  }
});
