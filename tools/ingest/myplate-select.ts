import type { MealSlot } from "../../src/engine/meals";

import { isSnackLikeBreakfast, isVegetarianCapable } from "./myplate-diet";
import { isDroppedCourse, type MyPlateCourse } from "./myplate-html";

export const SLOT_TARGETS: Record<MealSlot, number> = {
  breakfast: 45,
  lunch: 45,
  dinner: 45,
  snack: 30,
};

export const VEG_TARGETS: Record<"breakfast" | "lunch" | "dinner", number> = {
  breakfast: 40,
  lunch: 40,
  dinner: 40,
};

export type CountedRecipe = {
  slots: string[];
  dietTags: string[];
};

export type SlotCounts = {
  slots: Record<MealSlot, number>;
  veg: Record<"breakfast" | "lunch" | "dinner", number>;
};

export function countCatalog(recipes: CountedRecipe[]): SlotCounts {
  const slots: SlotCounts["slots"] = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
  const veg: SlotCounts["veg"] = { breakfast: 0, lunch: 0, dinner: 0 };
  for (const recipe of recipes) {
    const vegetarian = isVegetarianCapable(recipe.dietTags);
    for (const slot of recipe.slots) {
      if (slot in slots) slots[slot as MealSlot] += 1;
      if (vegetarian && (slot === "breakfast" || slot === "lunch" || slot === "dinner")) {
        veg[slot] += 1;
      }
    }
  }
  return { slots, veg };
}

export function assignSlots(
  course: MyPlateCourse,
  title: string,
  counts: SlotCounts,
  proteinPerServing: number,
): MealSlot[] | null {
  if (isDroppedCourse(course) || course === "other" || course === "side") return null;

  if (course === "breakfast") {
    const slots: MealSlot[] = [];
    if (counts.slots.breakfast < SLOT_TARGETS.breakfast) slots.push("breakfast");
    if (isSnackLikeBreakfast(title) && counts.slots.snack < SLOT_TARGETS.snack) {
      slots.push("snack");
    }
    return slots.length ? slots : null;
  }

  if (course === "snack") {
    return counts.slots.snack < SLOT_TARGETS.snack ? ["snack"] : null;
  }

  if (course === "main") {
    const slots: MealSlot[] = [];
    if (counts.slots.lunch < SLOT_TARGETS.lunch) slots.push("lunch");
    if (counts.slots.dinner < SLOT_TARGETS.dinner) slots.push("dinner");
    return slots.length ? slots : null;
  }

  if ((course === "soup" || course === "salad") && proteinPerServing >= 15) {
    return counts.slots.lunch < SLOT_TARGETS.lunch ? ["lunch"] : null;
  }

  return null;
}

export type SelectCandidate = {
  slug: string;
  title: string;
  course: MyPlateCourse;
  dietTags: string[];
  proteinPerServing: number;
};

export type SelectResult = {
  chosen: Array<SelectCandidate & { slots: MealSlot[] }>;
  skipped: string[];
};

/** `ordered` is already fill-order and FDC-ok. Caps include `existing`. */
export function selectMyPlateAdds(
  existing: CountedRecipe[],
  ordered: SelectCandidate[],
): SelectResult {
  const counts = countCatalog(existing);
  const chosen: SelectResult["chosen"] = [];
  const skipped: string[] = [];

  for (const candidate of ordered) {
    const slots = assignSlots(
      candidate.course,
      candidate.title,
      counts,
      candidate.proteinPerServing,
    );
    if (!slots) {
      skipped.push(candidate.slug);
      continue;
    }
    chosen.push({ ...candidate, slots });
    const vegetarian = isVegetarianCapable(candidate.dietTags);
    for (const slot of slots) {
      counts.slots[slot] += 1;
      if (vegetarian && slot !== "snack") counts.veg[slot] += 1;
    }
  }

  return { chosen, skipped };
}

export function fillPriority(candidate: SelectCandidate): number {
  const veg = isVegetarianCapable(candidate.dietTags);
  if (candidate.course === "breakfast" && veg) return 0;
  if (candidate.course === "main" && veg) return 1;
  if (candidate.course === "breakfast") return 2;
  if (candidate.course === "main") return 3;
  if (candidate.course === "snack") return 4;
  if (candidate.course === "soup" || candidate.course === "salad") return 5;
  return 9;
}

export function sortFillOrder(candidates: SelectCandidate[]): SelectCandidate[] {
  return [...candidates].sort((a, b) => fillPriority(a) - fillPriority(b) || a.slug.localeCompare(b.slug));
}

export function myplateEnergyAgrees(
  fdcRecipeKcal: number,
  servings: number,
  myplateKcalPerServing: number | null,
): boolean {
  if (myplateKcalPerServing == null || myplateKcalPerServing <= 0) return true;
  const perServing = fdcRecipeKcal / Math.max(servings, 1);
  const tolerance = Math.max(40, 0.15 * myplateKcalPerServing);
  return Math.abs(perServing - myplateKcalPerServing) <= tolerance;
}
