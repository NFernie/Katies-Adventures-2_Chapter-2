import assert from "node:assert/strict";
import test from "node:test";

import {
  assignDayMeals,
  recipeEligible,
  swapCandidates,
  type CatalogRecipe,
} from "./meals.ts";

const meat: CatalogRecipe = {
  slug: "chicken-plate",
  title: "Chicken plate",
  slots: ["dinner"],
  dietTags: [],
  allergens: [],
  kitchenTags: ["batch_cook"],
  cookMinutes: 25,
  servings: 1,
  nutrition: { kcal: 610, proteinG: 42, carbG: 40, fatG: 20, source: "usda-fdc" },
};

const vegDinner: CatalogRecipe = {
  slug: "tofu-stir-fry",
  title: "Tofu stir-fry + rice",
  slots: ["dinner"],
  dietTags: ["vegetarian"],
  allergens: ["soy"],
  kitchenTags: ["batch_cook"],
  cookMinutes: 20,
  servings: 1,
  nutrition: { kcal: 600, proteinG: 36, carbG: 70, fatG: 16, source: "usda-fdc" },
};

const veganDinner: CatalogRecipe = {
  slug: "lentil-chilli",
  title: "Lentil chilli + rice",
  slots: ["dinner"],
  dietTags: ["vegan", "vegetarian"],
  allergens: [],
  kitchenTags: ["batch_cook", "leftovers_as_lunch"],
  cookMinutes: 35,
  servings: 4,
  nutrition: { kcal: 590, proteinG: 33, carbG: 80, fatG: 12, source: "usda-fdc" },
};

const yogurt: CatalogRecipe = {
  slug: "greek-yogurt-berry-bowl",
  title: "Greek yogurt berry bowl",
  slots: ["breakfast", "snack"],
  dietTags: ["vegetarian"],
  allergens: ["dairy"],
  kitchenTags: [],
  cookMinutes: 5,
  servings: 1,
  nutrition: { kcal: 146, proteinG: 20.4, carbG: 8.1, fatG: 0.8, source: "usda-fdc" },
};

test("vegetarian flag never selects a meat recipe", () => {
  assert.equal(recipeEligible(meat, ["vegetarian"], []), false);
  const day = assignDayMeals({
    energyKcal: 1930,
    proteinG: 158,
    recipes: [meat, vegDinner, yogurt],
    dietFlags: ["vegetarian"],
    kitchenFlags: [],
    pinned: {},
  });
  assert.equal(day.slots.dinner?.slug, "tofu-stir-fry");
  assert.notEqual(day.slots.dinner?.slug, "chicken-plate");
});

test("vegan flag rejects vegetarian-only dairy", () => {
  assert.equal(recipeEligible(yogurt, ["vegan"], []), false);
  assert.equal(recipeEligible(veganDinner, ["vegan"], []), true);
});

test("empty catalog yields empty slots, not invented meals", () => {
  const day = assignDayMeals({
    energyKcal: 1930,
    proteinG: 158,
    recipes: [],
    dietFlags: ["vegetarian"],
    kitchenFlags: [],
    pinned: {},
  });
  assert.equal(day.slots.breakfast, null);
  assert.deepEqual(day.empty, ["breakfast", "lunch", "dinner", "snack"]);
});

test("pinned slug is kept even when another recipe is closer", () => {
  const day = assignDayMeals({
    energyKcal: 1930,
    proteinG: 158,
    recipes: [vegDinner, veganDinner],
    dietFlags: ["vegetarian"],
    kitchenFlags: [],
    pinned: { dinner: "lentil-chilli" },
  });
  assert.equal(day.slots.dinner?.slug, "lentil-chilli");
});

test("swap candidates stay in-slot and within ±10% kcal / ±20% protein of the slot target", () => {
  const breakfasts: CatalogRecipe[] = [
    yogurt,
    {
      slug: "oats-bowl",
      title: "Oats bowl",
      slots: ["breakfast"],
      dietTags: ["vegetarian"],
      allergens: ["gluten"],
      kitchenTags: [],
      cookMinutes: 10,
      servings: 1,
      nutrition: { kcal: 480, proteinG: 40, carbG: 60, fatG: 10, source: "usda-fdc" },
    },
    {
      slug: "skyr-bowl",
      title: "Skyr bowl",
      slots: ["breakfast"],
      dietTags: ["vegetarian"],
      allergens: ["dairy"],
      kitchenTags: [],
      cookMinutes: 5,
      servings: 1,
      nutrition: { kcal: 500, proteinG: 42, carbG: 50, fatG: 12, source: "usda-fdc" },
    },
  ];
  const found = swapCandidates({
    slot: "breakfast",
    currentSlug: "oats-bowl",
    recipes: breakfasts,
    dietFlags: ["vegetarian"],
    kitchenFlags: [],
    targetKcal: 482.5,
    targetProteinG: 39.5,
  });
  assert.ok(found.every((row) => row.slots.includes("breakfast")));
  assert.ok(found.every((row) => row.slug !== "oats-bowl"));
  assert.ok(!found.some((row) => row.slug === "greek-yogurt-berry-bowl"));
});
