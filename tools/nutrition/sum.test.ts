import assert from "node:assert/strict";
import test from "node:test";

import { ATWATER_TOLERANCE_KCAL, sumRecipe } from "./sum.ts";
import type { FdcCache, RecipeDraft } from "./types.ts";

/**
 * Seam: sumRecipe(draft, cache) → nutrition.
 * Expected macros are the §4.2 / recipe-nutrition.md worked example literals,
 * not values recomputed in the test from a second copy of the formula.
 */
const SPEC_YOGURT: RecipeDraft = {
  slug: "greek-yogurt-berry-bowl",
  ingredients: [
    {
      name: "Greek yogurt, plain, nonfat",
      grams: 200,
      fdcId: 170903,
      matchNote: "FDC nonfat Greek yogurt",
    },
  ],
};

const SPEC_CACHE: FdcCache = {
  version: 1,
  foods: {
    "170903": {
      fdcId: 170903,
      description: "Yogurt, Greek, plain, nonfat",
      dataType: "SR Legacy",
      fetchedAt: "2026-08-18T00:00:00Z",
      per100g: { kcal: 73, proteinG: 10.2, carbG: 4.05, fatG: 0.4 },
    },
  },
};

test("sumRecipe matches the spec greek-yogurt 200 g literals", () => {
  const nutrition = sumRecipe(SPEC_YOGURT, SPEC_CACHE);
  assert.equal(nutrition.kcal, 146);
  assert.equal(nutrition.proteinG, 20.4);
  assert.equal(nutrition.carbG, 8.1);
  assert.equal(nutrition.fatG, 0.8);
  assert.equal(nutrition.source, "usda-fdc");
  assert.equal(nutrition.checksumOk, true);
  assert.ok(ATWATER_TOLERANCE_KCAL >= 25);
});

test("sumRecipe throws when an ingredient has no fdcId", () => {
  const draft: RecipeDraft = {
    slug: "bad",
    ingredients: [{ name: "mystery", grams: 50, fdcId: 0 }],
  };
  assert.throws(() => sumRecipe(draft, SPEC_CACHE), /fdcId/i);
});

test("sumRecipe throws on a cache miss instead of inventing macros", () => {
  const draft: RecipeDraft = {
    slug: "missing",
    ingredients: [{ name: "oats", grams: 40, fdcId: 999999 }],
  };
  assert.throws(() => sumRecipe(draft, SPEC_CACHE), /cache miss|999999/i);
});
