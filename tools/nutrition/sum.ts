import type { FdcCache, RecipeDraft, RecipeNutrition } from "./types.ts";

/** |kcal − (4P + 4C + 9F)| allowed so the §4.2 yogurt example (gap ~25) still checksums. */
export const ATWATER_TOLERANCE_KCAL = 30;

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function atwaterKcal(proteinG: number, carbG: number, fatG: number): number {
  return 4 * proteinG + 4 * carbG + 9 * fatG;
}

export function sumRecipe(
  draft: RecipeDraft,
  cache: FdcCache,
  computedAt = new Date().toISOString(),
): RecipeNutrition {
  let kcal = 0;
  let proteinG = 0;
  let carbG = 0;
  let fatG = 0;

  for (const ingredient of draft.ingredients) {
    if (!ingredient.fdcId) {
      throw new Error(`Ingredient "${ingredient.name}" is missing fdcId`);
    }
    const food = cache.foods[String(ingredient.fdcId)];
    if (!food) {
      throw new Error(`FDC cache miss for fdcId ${ingredient.fdcId}`);
    }
    const factor = ingredient.grams / 100;
    kcal += food.per100g.kcal * factor;
    proteinG += food.per100g.proteinG * factor;
    carbG += food.per100g.carbG * factor;
    fatG += food.per100g.fatG * factor;
  }

  const protein = round1(proteinG);
  const carb = round1(carbG);
  const fat = round1(fatG);
  const energy = Math.round(kcal);
  const checksumOk =
    Math.abs(energy - atwaterKcal(protein, carb, fat)) <= ATWATER_TOLERANCE_KCAL;

  return {
    kcal: energy,
    proteinG: protein,
    carbG: carb,
    fatG: fat,
    source: "usda-fdc",
    computedAt,
    checksumOk,
  };
}
