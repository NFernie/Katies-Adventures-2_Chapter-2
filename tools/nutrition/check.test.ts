import assert from "node:assert/strict";
import test from "node:test";

import { checkRecipes } from "./check.ts";
import type { FdcCache, RecipeDraft } from "./types.ts";

const cache: FdcCache = {
  version: 1,
  foods: {
    "170903": {
      fdcId: 170903,
      description: "Yogurt",
      dataType: "SR Legacy",
      fetchedAt: "2026-08-18T00:00:00Z",
      per100g: { kcal: 73, proteinG: 10.2, carbG: 4.05, fatG: 0.4 },
    },
  },
};

const okRecipe = {
  slug: "greek-yogurt-berry-bowl",
  ingredients: [
    { name: "Greek yogurt, plain, nonfat", grams: 200, fdcId: 170903 },
  ],
  nutrition: {
    kcal: 146,
    proteinG: 20.4,
    carbG: 8.1,
    fatG: 0.8,
    source: "usda-fdc" as const,
    computedAt: "2026-08-18T00:00:00Z",
    checksumOk: true,
  },
};

test("checkRecipes accepts the spec yogurt literals", () => {
  assert.deepEqual(checkRecipes([okRecipe], cache), []);
});

test("checkRecipes rejects LLM-only source and zero macros", () => {
  const guessed = {
    ...okRecipe,
    slug: "llm-guess",
    nutrition: {
      ...okRecipe.nutrition,
      kcal: 0,
      proteinG: 0,
      source: "llm" as unknown as "usda-fdc",
    },
  };
  const errors = checkRecipes([guessed], cache);
  assert.ok(errors.some((row) => /usda-fdc/i.test(row)));
  assert.ok(errors.some((row) => /placeholder macros/i.test(row)));
});

test("checkRecipes rejects nutrition that does not match the cache sum", () => {
  const drifted: RecipeDraft & { nutrition: typeof okRecipe.nutrition } = {
    ...okRecipe,
    nutrition: { ...okRecipe.nutrition, kcal: 900, proteinG: 90 },
  };
  const errors = checkRecipes([drifted], cache);
  assert.ok(errors.some((row) => /does not match FDC cache sum/i.test(row)));
});
