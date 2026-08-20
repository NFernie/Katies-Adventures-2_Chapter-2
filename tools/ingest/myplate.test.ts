import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { recipeSourceCredit } from "../../src/catalog/attribution.ts";
import { householdToGrams, isSkippableIngredientLine } from "./household.ts";
import { inferDietTags, isSnackLikeBreakfast } from "./myplate-diet.ts";
import { parseMyPlateHtml, sourceAttribution } from "./myplate-html.ts";
import {
  assignSlots,
  countCatalog,
  myplateEnergyAgrees,
  selectMyPlateAdds,
  sortFillOrder,
  type SlotCounts,
} from "./myplate-select.ts";
import { enrichDraftWithUsda, mergeRecipes } from "./recipes.ts";
import type { FdcCache } from "../nutrition/types.ts";

const chickenHtml = readFileSync(
  new URL("./fixtures/2-step-chicken.html", import.meta.url),
  "utf8",
);
const yogurtHtml = readFileSync(
  new URL("./fixtures/yogurt-parfait-breakfast.html", import.meta.url),
  "utf8",
);

const emptyCounts = (): SlotCounts => ({
  slots: { breakfast: 0, lunch: 0, dinner: 0, snack: 0 },
  veg: { breakfast: 0, lunch: 0, dinner: 0 },
});

test("parser reads title, ingredients, steps, and main-dish course from fixture HTML", () => {
  const parsed = parseMyPlateHtml(
    chickenHtml,
    "https://web.archive.org/web/20250117181741/https://www.myplate.gov/recipes/2-step-chicken",
  );
  assert.equal(parsed.title, "2-Step Chicken");
  assert.equal(parsed.course, "main");
  assert.equal(parsed.slug, "2-step-chicken");
  assert.equal(parsed.servings, 4);
  assert.ok(parsed.ingredientLines.some((line) => /vegetable oil/i.test(line)));
  assert.ok(parsed.steps.some((step) => /Wash hands/i.test(step)));
  assert.match(parsed.contributor ?? "", /ONIE/i);
  assert.ok((parsed.myplateKcalPerServing ?? 0) > 100);
});

test("1 tablespoon olive oil converts to about 14 g", () => {
  const parsed = householdToGrams("1 tablespoon olive oil");
  assert.equal(parsed.grams, 14);
  assert.match(parsed.name, /olive oil/i);
});

test("count produce without a unit uses a typical piece weight", () => {
  const parsed = householdToGrams("1 granny smith apple");
  assert.equal(parsed.grams, 182);
  assert.match(parsed.name, /apple/i);
});

test("amount in trailing parentheses is used when the line has no leading qty", () => {
  const parsed = householdToGrams("lime, juiced (1 1/2 tsp lime juice)");
  assert.equal(parsed.grams, 8);
  assert.match(parsed.name, /lime/i);
});

test("cooking spray and optional-to-serve lines are skipped, not invented", () => {
  assert.equal(isSkippableIngredientLine("nonstick cooking spray"), true);
  assert.equal(isSkippableIngredientLine("maple syrup (optional, to serve with pancakes)"), true);
  assert.equal(isSkippableIngredientLine("1 teaspoon cumin"), true);
  assert.equal(isSkippableIngredientLine("1 tablespoon olive oil"), false);
});

test("main dish dual-tags lunch and dinner until a slot hits 45", () => {
  const open = assignSlots("main", "Bean chilli", emptyCounts(), 20);
  assert.deepEqual(open, ["lunch", "dinner"]);
  const lunchFull = emptyCounts();
  lunchFull.slots.lunch = 45;
  assert.deepEqual(assignSlots("main", "Bean chilli", lunchFull, 20), ["dinner"]);
});

test("snack-like breakfast also tags snack; dessert course is rejected", () => {
  assert.equal(isSnackLikeBreakfast("Yogurt fruit parfait"), true);
  const slots = assignSlots("breakfast", "Yogurt fruit parfait", emptyCounts(), 8);
  assert.ok(slots?.includes("breakfast"));
  assert.ok(slots?.includes("snack"));
  assert.equal(assignSlots("dessert", "Apple cake", emptyCounts(), 3), null);
});

test("FDC mismatch vs MyPlate kcal is rejected so the recipe can be exchanged", () => {
  assert.equal(myplateEnergyAgrees(800, 4, 154), false);
  assert.equal(myplateEnergyAgrees(616, 4, 154), true);
});

test("failed FDC rows are skipped; next same-course vegetarian candidate is taken", () => {
  const existing = Array.from({ length: 5 }, (_, i) => ({
    slots: ["breakfast"],
    dietTags: ["vegetarian"],
  }));
  const ordered = sortFillOrder([
    {
      slug: "failed-eggs",
      title: "Egg scramble",
      course: "breakfast",
      dietTags: [],
      proteinPerServing: 20,
    },
    {
      slug: "ok-oats",
      title: "Oat bowl",
      course: "breakfast",
      dietTags: ["vegetarian"],
      proteinPerServing: 12,
    },
  ]);
  const usable = ordered.filter((row) => row.slug !== "failed-eggs");
  const result = selectMyPlateAdds(existing, usable);
  assert.deepEqual(
    result.chosen.map((row) => row.slug),
    ["ok-oats"],
  );
  assert.ok(result.chosen[0]?.slots.includes("breakfast"));
});

test("mergeRecipes still skips first-party slugs that omit reviewed:false", () => {
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
  const kept = enrichDraftWithUsda(
    {
      slug: "greek-yogurt-berry-bowl",
      title: "Greek yogurt berry bowl",
      slots: ["breakfast"],
      dietTags: ["vegetarian"],
      allergens: ["dairy"],
      kitchenTags: [],
      cookMinutes: 5,
      servings: 1,
      equipment: ["none"],
      steps: ["Stir."],
      ingredients: [{ name: "yogurt", grams: 200, fdcId: 170894 }],
    },
    cache,
  );
  const { reviewed: _ignored, ...unflagged } = kept;
  const result = mergeRecipes([unflagged as typeof kept], [
    { ...kept, title: "Should not replace" },
  ], cache);
  assert.deepEqual(result.skipped, ["greek-yogurt-berry-bowl"]);
  assert.equal(result.recipes[0]?.title, "Greek yogurt berry bowl");
});

test("MealCard credit helper prints USDA MyPlate Kitchen for those rows", () => {
  assert.equal(recipeSourceCredit({ sourceKind: "first-party" }), null);
  assert.equal(
    recipeSourceCredit({ sourceKind: "myplate-kitchen" }),
    "USDA MyPlate Kitchen",
  );
  assert.match(
    recipeSourceCredit({
      sourceKind: "myplate-kitchen",
      sourceAttribution: "USDA MyPlate Kitchen. ONIE Project",
    }) ?? "",
    /ONIE/,
  );
});

test("yogurt breakfast fixture is vegetarian and snack-like", () => {
  const parsed = parseMyPlateHtml(yogurtHtml, "https://www.myplate.gov/recipes/yogurt-fruit-parfait");
  assert.equal(parsed.course, "breakfast");
  assert.deepEqual(inferDietTags(parsed.ingredientLines.map((line) => householdToGrams(line).name)), [
    "vegetarian",
  ]);
  assert.equal(countCatalog([{ slots: ["breakfast"], dietTags: ["vegetarian"] }]).veg.breakfast, 1);
  assert.equal(sourceAttribution(parsed.contributor), "USDA MyPlate Kitchen");
});
