import type { CatalogRecipe } from "@/engine";

/**
 * Git-owned catalog. Stays empty until `nutrition:enrich` writes
 * `data/recipes.json` with `nutrition.source: usda-fdc`.
 * Do not fill this with LLM-guessed kcal/protein.
 */
export const CATALOG_RECIPES: CatalogRecipe[] = [];

export const catalogSeeded = CATALOG_RECIPES.length > 0;
