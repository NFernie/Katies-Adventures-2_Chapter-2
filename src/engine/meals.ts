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

export type CatalogIngredient = {
  name: string;
  grams: number;
  household?: string;
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
  steps?: string[];
  ingredients?: CatalogIngredient[];
  sourceKind?: string;
  sourceAttribution?: string;
  sourceUrl?: string;
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

function catalogKind(recipe: CatalogRecipe): "myplate-kitchen" | "first-party" {
  return recipe.sourceKind === "myplate-kitchen" ? "myplate-kitchen" : "first-party";
}

/** Macros for one plate: catalog yield divided by recipe servings. */
export function plateNutrition(recipe: CatalogRecipe, householdServings = 1): {
  kcal: number;
  proteinG: number;
} {
  const scale = householdServings / Math.max(recipe.servings, 1);
  return {
    kcal: recipe.nutrition.kcal * scale,
    proteinG: recipe.nutrition.proteinG * scale,
  };
}

function score(recipe: CatalogRecipe, targetKcal: number, targetProteinG: number): number {
  const plate = plateNutrition(recipe);
  const kcalGap = Math.abs(plate.kcal - targetKcal) / Math.max(targetKcal, 1);
  const proteinGap =
    Math.abs(plate.proteinG - targetProteinG) / Math.max(targetProteinG, 1);
  return kcalGap + proteinGap;
}

function kindPenalty(recipe: CatalogRecipe, prior: CatalogRecipe[]): number {
  const kind = catalogKind(recipe);
  const repeats = prior.filter((row) => catalogKind(row) === kind).length;
  return repeats * 0.45;
}

export function assignDayMeals(input: {
  energyKcal: number;
  proteinG: number;
  recipes: CatalogRecipe[];
  dietFlags: DietFlag[];
  kitchenFlags: KitchenFlag[];
  pinned: Partial<Record<MealSlot, string>>;
  usedSlugs?: Iterable<string>;
  priorBySlot?: Partial<Record<MealSlot, CatalogRecipe[]>>;
}): { slots: Record<MealSlot, AssignedMeal | null>; empty: MealSlot[] } {
  const slots = {
    breakfast: null,
    lunch: null,
    dinner: null,
    snack: null,
  } as Record<MealSlot, AssignedMeal | null>;
  const used = new Set(input.usedSlugs ?? []);

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
    const prior = input.priorBySlot?.[slot] ?? [];
    const pool = input.recipes.filter(
      (row) =>
        row.slots.includes(slot) &&
        row.nutrition.source === "usda-fdc" &&
        !used.has(row.slug) &&
        recipeEligible(row, input.dietFlags, input.kitchenFlags),
    );
    pool.sort(
      (a, b) =>
        score(a, targetKcal, targetProteinG) +
        kindPenalty(a, prior) -
        (score(b, targetKcal, targetProteinG) + kindPenalty(b, prior)),
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

export function assignPlanMeals(input: {
  dayCount: number;
  energyKcal: number;
  proteinG: number;
  recipes: CatalogRecipe[];
  dietFlags: DietFlag[];
  kitchenFlags: KitchenFlag[];
  pinned: Partial<Record<MealSlot, string>>;
}): Array<{ slots: Record<MealSlot, AssignedMeal | null>; empty: MealSlot[] }> {
  const used = new Set(Object.values(input.pinned).filter((slug): slug is string => Boolean(slug)));
  const priorBySlot: Record<MealSlot, CatalogRecipe[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
  const days = [];
  for (let day = 0; day < Math.max(input.dayCount, 0); day += 1) {
    const assigned = assignDayMeals({
      energyKcal: input.energyKcal,
      proteinG: input.proteinG,
      recipes: input.recipes,
      dietFlags: input.dietFlags,
      kitchenFlags: input.kitchenFlags,
      pinned: input.pinned,
      usedSlugs: used,
      priorBySlot,
    });
    days.push(assigned);
    for (const slot of MEAL_SLOTS) {
      const slug = assigned.slots[slot]?.slug;
      if (!slug) continue;
      used.add(slug);
      const recipe = input.recipes.find((row) => row.slug === slug);
      if (recipe) priorBySlot[slot].push(recipe);
    }
  }
  return days;
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
  const eligible = input.recipes.filter(
    (row) =>
      row.slug !== input.currentSlug &&
      row.slots.includes(input.slot) &&
      row.nutrition.source === "usda-fdc" &&
      recipeEligible(row, input.dietFlags, input.kitchenFlags),
  );
  const byScore = (a: CatalogRecipe, b: CatalogRecipe) =>
    score(a, input.targetKcal, input.targetProteinG) -
    score(b, input.targetKcal, input.targetProteinG);
  const inBand = eligible
    .filter((row) => {
      const plate = plateNutrition(row);
      return (
        plate.kcal >= kcalLo &&
        plate.kcal <= kcalHi &&
        plate.proteinG >= pLo &&
        plate.proteinG <= pHi
      );
    })
    .sort(byScore);
  const rest = eligible.filter((row) => !inBand.includes(row)).sort(byScore);
  return [...inBand, ...rest].slice(0, 3);
}

function toAssigned(slot: MealSlot, recipe: CatalogRecipe): AssignedMeal {
  const plate = plateNutrition(recipe);
  return {
    slot,
    slug: recipe.slug,
    title: recipe.title,
    kcal: plate.kcal,
    proteinG: plate.proteinG,
  };
}
