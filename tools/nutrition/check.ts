import { existsSync, readFileSync } from "node:fs";

import { readCache } from "./cache";
import { ATWATER_TOLERANCE_KCAL, atwaterKcal, sumRecipe } from "./sum";
import type { RecipeDraft, RecipeNutrition } from "./types";

const RECIPES_PATH = new URL("../../data/recipes.json", import.meta.url);

type CatalogRecipe = RecipeDraft & {
  title?: string;
  nutrition?: RecipeNutrition & { source?: string };
};

const PLACEHOLDER = /\b(TODO|TBD|LLM)\b/i;

export function checkRecipes(
  recipes: CatalogRecipe[],
  cache = readCache(),
): string[] {
  const errors: string[] = [];
  for (const recipe of recipes) {
    const label = recipe.slug || "(missing slug)";
    if (PLACEHOLDER.test(recipe.slug) || PLACEHOLDER.test(recipe.title ?? "")) {
      errors.push(`${label}: placeholder title/slug`);
    }
    for (const ingredient of recipe.ingredients ?? []) {
      if (!ingredient.fdcId) {
        errors.push(`${label}: ingredient "${ingredient.name}" missing fdcId`);
      }
    }
    const nutrition = recipe.nutrition;
    if (!nutrition) {
      errors.push(`${label}: missing nutrition`);
      continue;
    }
    if (nutrition.source !== "usda-fdc") {
      errors.push(`${label}: nutrition.source must be usda-fdc`);
    }
    if (nutrition.kcal === 0 && nutrition.proteinG === 0) {
      errors.push(`${label}: placeholder macros (0/0)`);
    }
    let summed: ReturnType<typeof sumRecipe> | null = null;
    try {
      summed = sumRecipe(recipe, cache);
    } catch (error) {
      errors.push(`${label}: ${error instanceof Error ? error.message : error}`);
    }
    if (summed) {
      if (summed.kcal !== nutrition.kcal || summed.proteinG !== nutrition.proteinG) {
        errors.push(
          `${label}: nutrition does not match FDC cache sum (wrote ${nutrition.kcal}/${nutrition.proteinG}, cache ${summed.kcal}/${summed.proteinG})`,
        );
      }
    }
    const atwater = atwaterKcal(
      nutrition.proteinG ?? 0,
      nutrition.carbG ?? 0,
      nutrition.fatG ?? 0,
    );
    if (Math.abs((nutrition.kcal ?? 0) - atwater) > ATWATER_TOLERANCE_KCAL) {
      errors.push(`${label}: 4-4-9 checksum failed`);
    }
    if (nutrition.checksumOk === false) {
      errors.push(`${label}: checksumOk is false`);
    }
  }
  return errors;
}

export function runCheck(): number {
  if (!existsSync(RECIPES_PATH)) {
    console.error(
      "data/recipes.json is missing. Catalog is not done. Get a data.gov FDC key: bash scripts/wizard-usda-fdc.sh",
    );
    return 2;
  }
  const recipes = JSON.parse(readFileSync(RECIPES_PATH, "utf8")) as CatalogRecipe[];
  if (!Array.isArray(recipes) || recipes.length === 0) {
    console.error("data/recipes.json is empty. Catalog is not done.");
    return 2;
  }
  const errors = checkRecipes(recipes);
  if (errors.length) {
    for (const error of errors) console.error(error);
    return 1;
  }
  console.log(`nutrition:check ok (${recipes.length} recipes, cache hits only)`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(runCheck());
}
