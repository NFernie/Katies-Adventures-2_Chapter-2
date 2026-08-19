export type NutrientPer100g = {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
};

export type CachedFood = {
  fdcId: number;
  description: string;
  dataType: string;
  fetchedAt: string;
  per100g: NutrientPer100g;
};

export type FdcCache = {
  version: 1;
  foods: Record<string, CachedFood>;
};

export type RecipeIngredient = {
  name: string;
  grams: number;
  household?: string;
  fdcId: number;
  matchNote?: string;
};

export type RecipeDraft = {
  slug: string;
  ingredients: RecipeIngredient[];
};

export type RecipeNutrition = {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  source: "usda-fdc";
  computedAt: string;
  checksumOk: boolean;
};
