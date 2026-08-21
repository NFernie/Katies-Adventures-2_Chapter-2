import type { CatalogRecipe, MealSlot } from "@/engine";

import rawRecipes from "../../data/recipes.json";

type CatalogFileRecipe = {
  slug: string;
  title: string;
  slots: MealSlot[];
  dietTags: string[];
  allergens: string[];
  kitchenTags: string[];
  cookMinutes: number;
  servings: number;
  steps?: string[];
  ingredients?: Array<{ name: string; grams: number; household?: string }>;
  sourceKind?: string;
  sourceAttribution?: string;
  sourceUrl?: string;
  nutrition: {
    kcal: number;
    proteinG: number;
    carbG: number;
    fatG: number;
    source: string;
  };
};

function kitchenTagsFor(row: CatalogFileRecipe): string[] {
  const tags = new Set(row.kitchenTags ?? []);
  if (
    row.servings >= 4 &&
    row.slots.includes("lunch") &&
    row.slots.includes("dinner")
  ) {
    tags.add("batch_cook");
    tags.add("leftovers_as_lunch");
  }
  return [...tags];
}

function toCatalog(row: CatalogFileRecipe): CatalogRecipe | null {
  if (row.nutrition.source !== "usda-fdc") return null;
  return {
    slug: row.slug,
    title: row.title,
    slots: row.slots,
    dietTags: row.dietTags,
    allergens: row.allergens,
    kitchenTags: kitchenTagsFor(row),
    cookMinutes: row.cookMinutes,
    servings: row.servings,
    steps: row.steps ?? [],
    ingredients: (row.ingredients ?? []).map((ingredient) => ({
      name: ingredient.name,
      grams: ingredient.grams,
      household: ingredient.household,
    })),
    sourceKind: row.sourceKind,
    sourceAttribution: row.sourceAttribution,
    sourceUrl: row.sourceUrl,
    nutrition: {
      kcal: row.nutrition.kcal,
      proteinG: row.nutrition.proteinG,
      carbG: row.nutrition.carbG,
      fatG: row.nutrition.fatG,
      source: "usda-fdc",
    },
  };
}

export const CATALOG_RECIPES: CatalogRecipe[] = (
  rawRecipes as CatalogFileRecipe[]
)
  .map(toCatalog)
  .filter((row): row is CatalogRecipe => row != null);

export const catalogSeeded = CATALOG_RECIPES.length > 0;
