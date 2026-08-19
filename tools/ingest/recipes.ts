import { checkRecipes } from "../nutrition/check";
import { sumRecipe } from "../nutrition/sum";
import type { FdcCache, RecipeIngredient, RecipeNutrition } from "../nutrition/types";

export type IngestRecipeDraft = {
  slug: string;
  title: string;
  slots: string[];
  dietTags: string[];
  allergens: string[];
  kitchenTags: string[];
  cookMinutes: number;
  servings: number;
  equipment: string[];
  steps: string[];
  ingredients: RecipeIngredient[];
  nutrition?: Partial<RecipeNutrition> & { source?: string };
  reviewed?: boolean;
  sourceKind?: string;
  sourceUrl?: string;
  license?: string;
};

export type CatalogRecipeRow = IngestRecipeDraft & {
  nutrition: RecipeNutrition;
};

export type MergeRecipesResult = {
  recipes: CatalogRecipeRow[];
  added: string[];
  skipped: string[];
};

function isReviewed(row: { reviewed?: boolean }): boolean {
  return row.reviewed !== false;
}

export function enrichDraftWithUsda(
  draft: IngestRecipeDraft,
  cache: FdcCache,
  computedAt = new Date().toISOString(),
): CatalogRecipeRow {
  for (const ingredient of draft.ingredients ?? []) {
    if (!ingredient.fdcId) {
      throw new Error(`${draft.slug}: ingredient "${ingredient.name}" missing fdcId`);
    }
  }
  const nutrition = sumRecipe(draft, cache, computedAt);
  if (nutrition.source !== "usda-fdc") {
    throw new Error(`${draft.slug}: enricher must write usda-fdc`);
  }
  const row = { ...draft, nutrition } satisfies CatalogRecipeRow;
  const errors = checkRecipes([row], cache);
  if (errors.length) {
    throw new Error(errors.join("; "));
  }
  return row;
}

export function mergeRecipes(
  existing: CatalogRecipeRow[],
  drafts: IngestRecipeDraft[],
  cache: FdcCache,
  options: { overwriteReviewed?: boolean } = {},
): MergeRecipesResult {
  const recipes = existing.map((row) => ({ ...row }));
  const bySlug = new Map(recipes.map((row, index) => [row.slug, index]));
  const added: string[] = [];
  const skipped: string[] = [];

  for (const draft of drafts) {
    const enriched = enrichDraftWithUsda(draft, cache);
    const index = bySlug.get(enriched.slug);
    if (index != null) {
      const current = recipes[index];
      if (current && isReviewed(current) && !options.overwriteReviewed) {
        skipped.push(enriched.slug);
        continue;
      }
      recipes[index] = enriched;
      continue;
    }
    recipes.push(enriched);
    bySlug.set(enriched.slug, recipes.length - 1);
    added.push(enriched.slug);
  }

  return { recipes, added, skipped };
}
