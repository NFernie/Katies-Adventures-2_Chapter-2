import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { CachedFood, NutrientPer100g } from "./types.ts";

const FDC_BASE = "https://api.nal.usda.gov/fdc/v1";

const ENERGY_IDS = new Set([1008, 2048, 2047]);
const PROTEIN_IDS = new Set([1003]);
const CARB_IDS = new Set([1005]);
const FAT_IDS = new Set([1004]);

type FdcNutrient = {
  amount?: number;
  nutrient?: { id?: number; number?: string; name?: string; unitName?: string };
};

type FdcFood = {
  fdcId: number;
  description?: string;
  dataType?: string;
  foodNutrients?: FdcNutrient[];
};

function pickAmount(nutrients: FdcNutrient[], ids: Set<number>): number {
  for (const row of nutrients) {
    const id = row.nutrient?.id;
    if (id != null && ids.has(id) && typeof row.amount === "number") {
      return row.amount;
    }
  }
  return 0;
}

export function nutrientsFromFdcFood(food: FdcFood): NutrientPer100g {
  const list = food.foodNutrients ?? [];
  return {
    kcal: pickAmount(list, ENERGY_IDS),
    proteinG: pickAmount(list, PROTEIN_IDS),
    carbG: pickAmount(list, CARB_IDS),
    fatG: pickAmount(list, FAT_IDS),
  };
}

export function loadToolEnv(): void {
  for (const file of [".env", ".env.local"]) {
    try {
      const text = readFileSync(resolve(file), "utf8");
      for (const line of text.split(/\r?\n/)) {
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq < 1) continue;
        const key = line.slice(0, eq).trim();
        const value = line.slice(eq + 1).trim();
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {
      /* gitignored env may be absent */
    }
  }
}

export function readUsdaKey(): string {
  loadToolEnv();
  const key = process.env.USDA_FDC_API_KEY?.trim() ?? "";
  if (!key) {
    throw new Error(
      "USDA_FDC_API_KEY is missing. Run bash scripts/wizard-usda-fdc.sh and stop — the catalog is not done.",
    );
  }
  if (key === "DEMO_KEY") {
    throw new Error("DEMO_KEY is too fragile for BodyPlan CI. Use a data.gov FDC key.");
  }
  return key;
}

export async function fetchFdcFood(
  fdcId: number,
  key: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CachedFood> {
  const url = `${FDC_BASE}/food/${fdcId}?api_key=${encodeURIComponent(key)}`;
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`FDC ${fdcId} HTTP ${response.status}`);
  }
  const food = (await response.json()) as FdcFood;
  return {
    fdcId: food.fdcId ?? fdcId,
    description: food.description ?? "",
    dataType: food.dataType ?? "",
    fetchedAt: new Date().toISOString(),
    per100g: nutrientsFromFdcFood(food),
  };
}
