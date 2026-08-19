import type { DietFlag, KitchenFlag } from "./types";

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

/** Share of daily energy/protein per slot. */
export const SLOT_SHARE: Record<MealSlot, number> = {
  breakfast: 0.25,
  lunch: 0.3,
  dinner: 0.35,
  snack: 0.1,
};

export type CatalogRecipe = {
  slug: string;
  title: string;
  slots: MealSlot[];
  dietTags: string[];
  allergens: string[];
  kitchenTags: string[];
  cookMinutes: number;
  servings: number;
  nutrition: {
    kcal: number;
    proteinG: number;
    carbG: number;
    fatG: number;
    source: "usda-fdc";
  };
};

export type AssignedMeal = {
  slot: MealSlot;
  slug: string;
  title: string;
  kcal: number;
  proteinG: number;
};

const ALLERGY_TO_ALLERGEN: Partial<Record<DietFlag, string>> = {
  allergy_nuts: "nuts",
  allergy_dairy: "dairy",
  allergy_gluten: "gluten",
  allergy_shellfish: "shellfish",
  allergy_egg: "egg",
  allergy_soy: "soy",
};

export function recipeEligible(
  recipe: CatalogRecipe,
  dietFlags: DietFlag[],
  kitchenFlags: KitchenFlag[],
): boolean {
  if (dietFlags.includes("vegan") && !recipe.dietTags.includes("vegan")) {
    return false;
  }
  if (
    dietFlags.includes("vegetarian") &&
    !recipe.dietTags.includes("vegetarian") &&
    !recipe.dietTags.includes("vegan")
  ) {
    return false;
  }
  if (dietFlags.includes("cook_under_30") && recipe.cookMinutes > 30) {
    return false;
  }
  for (const flag of dietFlags) {
    const allergen = ALLERGY_TO_ALLERGEN[flag];
    if (allergen && recipe.allergens.includes(allergen)) return false;
  }
  for (const flag of kitchenFlags) {
    if (flag === "eating_out_days") continue;
    if (!recipe.kitchenTags.includes(flag)) return false;
  }
  return true;
}

function score(recipe: CatalogRecipe, targetKcal: number, targetProteinG: number): number {
  const kcalGap = Math.abs(recipe.nutrition.kcal - targetKcal) / Math.max(targetKcal, 1);
  const proteinGap =
    Math.abs(recipe.nutrition.proteinG - targetProteinG) / Math.max(targetProteinG, 1);
  return kcalGap + proteinGap;
}

export function assignDayMeals(input: {
  energyKcal: number;
  proteinG: number;
  recipes: CatalogRecipe[];
  dietFlags: DietFlag[];
  kitchenFlags: KitchenFlag[];
  pinned: Partial<Record<MealSlot, string>>;
}): { slots: Record<MealSlot, AssignedMeal | null>; empty: MealSlot[] } {
  const slots = {
    breakfast: null,
    lunch: null,
    dinner: null,
    snack: null,
  } as Record<MealSlot, AssignedMeal | null>;
  const used = new Set<string>();

  for (const slot of MEAL_SLOTS) {
    const pinnedSlug = input.pinned[slot];
    const pinnedRecipe = pinnedSlug
      ? input.recipes.find((row) => row.slug === pinnedSlug)
      : undefined;
    if (pinnedRecipe) {
      slots[slot] = toAssigned(slot, pinnedRecipe);
      used.add(pinnedRecipe.slug);
      continue;
    }
    const targetKcal = input.energyKcal * SLOT_SHARE[slot];
    const targetProteinG = input.proteinG * SLOT_SHARE[slot];
    const pool = input.recipes.filter(
      (row) =>
        row.slots.includes(slot) &&
        row.nutrition.source === "usda-fdc" &&
        !used.has(row.slug) &&
        recipeEligible(row, input.dietFlags, input.kitchenFlags),
    );
    pool.sort(
      (a, b) =>
        score(a, targetKcal, targetProteinG) - score(b, targetKcal, targetProteinG),
    );
    const pick = pool[0];
    if (pick) {
      slots[slot] = toAssigned(slot, pick);
      used.add(pick.slug);
    }
  }

  const empty = MEAL_SLOTS.filter((slot) => slots[slot] == null);
  return { slots, empty };
}

export function swapCandidates(input: {
  slot: MealSlot;
  currentSlug: string;
  recipes: CatalogRecipe[];
  dietFlags: DietFlag[];
  kitchenFlags: KitchenFlag[];
  targetKcal: number;
  targetProteinG: number;
}): CatalogRecipe[] {
  const kcalLo = input.targetKcal * 0.9;
  const kcalHi = input.targetKcal * 1.1;
  const pLo = input.targetProteinG * 0.8;
  const pHi = input.targetProteinG * 1.2;
  return input.recipes
    .filter(
      (row) =>
        row.slug !== input.currentSlug &&
        row.slots.includes(input.slot) &&
        row.nutrition.source === "usda-fdc" &&
        recipeEligible(row, input.dietFlags, input.kitchenFlags) &&
        row.nutrition.kcal >= kcalLo &&
        row.nutrition.kcal <= kcalHi &&
        row.nutrition.proteinG >= pLo &&
        row.nutrition.proteinG <= pHi,
    )
    .sort(
      (a, b) =>
        score(a, input.targetKcal, input.targetProteinG) -
        score(b, input.targetKcal, input.targetProteinG),
    )
    .slice(0, 3);
}

function toAssigned(slot: MealSlot, recipe: CatalogRecipe): AssignedMeal {
  return {
    slot,
    slug: recipe.slug,
    title: recipe.title,
    kcal: recipe.nutrition.kcal,
    proteinG: recipe.nutrition.proteinG,
  };
}
