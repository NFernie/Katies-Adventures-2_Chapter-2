import assert from "node:assert/strict";
import test from "node:test";

import { nutrientsFromFdcFood } from "./fdc.ts";

test("nutrientsFromFdcFood reads FDC nutrient ids per 100 g", () => {
  const per100g = nutrientsFromFdcFood({
    fdcId: 170903,
    description: "Yogurt, Greek, plain, nonfat",
    foodNutrients: [
      { amount: 73, nutrient: { id: 1008, name: "Energy", unitName: "kcal" } },
      { amount: 10.2, nutrient: { id: 1003, name: "Protein" } },
      { amount: 4.05, nutrient: { id: 1005, name: "Carbohydrate" } },
      { amount: 0.4, nutrient: { id: 1004, name: "Total lipid (fat)" } },
    ],
  });
  assert.deepEqual(per100g, { kcal: 73, proteinG: 10.2, carbG: 4.05, fatG: 0.4 });
});
