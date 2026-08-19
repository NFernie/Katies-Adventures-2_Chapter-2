import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { readCache, writeCache } from "./cache";
import { fetchFdcFood, readUsdaKey } from "./fdc";
import { sumRecipe } from "./sum";
import type { RecipeDraft } from "./types";

const RECIPES_PATH = new URL("../../data/recipes.json", import.meta.url);

type CatalogRecipe = RecipeDraft & {
  title?: string;
  nutrition?: { source?: string; kcal?: number };
};

function loadDrafts(): CatalogRecipe[] {
  if (!existsSync(RECIPES_PATH)) {
    throw new Error(
      "data/recipes.json is missing. Draft recipes, then enrich. Catalog is not done.",
    );
  }
  return JSON.parse(readFileSync(RECIPES_PATH, "utf8")) as CatalogRecipe[];
}

export async function enrichRecipes(
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const drafts = loadDrafts();
  const cache = readCache();
  const keyNeeded = drafts.some((recipe) =>
    recipe.ingredients.some((ing) => !cache.foods[String(ing.fdcId)]),
  );
  const key = keyNeeded ? readUsdaKey() : "";

  for (const recipe of drafts) {
    for (const ingredient of recipe.ingredients) {
      const id = String(ingredient.fdcId);
      if (cache.foods[id]) continue;
      cache.foods[id] = await fetchFdcFood(ingredient.fdcId, key, fetchImpl);
    }
    recipe.nutrition = sumRecipe(recipe, cache);
  }

  writeCache(cache);
  writeFileSync(RECIPES_PATH, `${JSON.stringify(drafts, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  enrichRecipes().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
