export type HouseholdParse = {
  grams: number;
  household: string;
  name: string;
};

const ML = {
  teaspoon: 5,
  tablespoon: 15,
  cup: 240,
} as const;

/** grams per ml (or per piece when unit is count). */
const DENSITY: Record<string, number> = {
  oil: 0.91,
  "olive oil": 0.91,
  "vegetable oil": 0.91,
  "canola oil": 0.91,
  "cooking oil": 0.91,
  butter: 0.91,
  water: 1,
  milk: 1.03,
  yogurt: 1.03,
  juice: 1.04,
  broth: 1,
  stock: 1,
  soup: 1,
  flour: 0.53,
  sugar: 0.85,
  oats: 0.4,
  rice: 0.85,
  honey: 1.42,
};

const COUNT_GRAMS: Record<string, number> = {
  egg: 50,
  clove: 3,
  "chicken breast": 170,
  "chicken breasts": 170,
  banana: 118,
  apple: 182,
};

function parseNumber(raw: string): number | null {
  const text = raw.trim();
  const mix = text.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mix) return Number(mix[1]) + Number(mix[2]) / Number(mix[3]);
  const frac = text.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = Number.parseFloat(text);
  return Number.isFinite(n) ? n : null;
}

function unitKey(unit: string): string {
  const u = unit.toLowerCase().replace(/\.$/, "");
  if (["tbsp", "tbs", "tablespoon", "tablespoons"].includes(u)) return "tablespoon";
  if (["tsp", "teaspoon", "teaspoons"].includes(u)) return "teaspoon";
  if (["cup", "cups", "c"].includes(u)) return "cup";
  if (["oz", "ounce", "ounces"].includes(u)) return "ounce";
  if (["lb", "lbs", "pound", "pounds"].includes(u)) return "pound";
  if (["g", "gram", "grams"].includes(u)) return "gram";
  if (["ml", "milliliter", "milliliters"].includes(u)) return "ml";
  if (["can", "cans"].includes(u)) return "can";
  if (["clove", "cloves"].includes(u)) return "clove";
  return u;
}

function densityFor(name: string): number {
  const lower = name.toLowerCase();
  for (const [key, density] of Object.entries(DENSITY)) {
    if (lower.includes(key)) return density;
  }
  return 1;
}

export function householdToGrams(line: string): HouseholdParse {
  const cleaned = line.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const match = cleaned.match(
    /^((?:\d+\s+\d+\/\d+)|(?:\d+\/\d+)|\d+(?:\.\d+)?)\s+([A-Za-z]+)\s+(.*)$/,
  );
  if (!match) {
    const count = cleaned.match(/^((?:\d+\s+\d+\/\d+)|(?:\d+\/\d+)|\d+(?:\.\d+)?)\s+(.*)$/);
    if (count) {
      const qty = parseNumber(count[1] ?? "");
      const name = (count[2] ?? "").trim();
      const each =
        Object.entries(COUNT_GRAMS).find(([key]) => name.toLowerCase().includes(key))?.[1] ?? 100;
      if (qty && qty > 0) {
        return { grams: Math.round(qty * each), household: line.trim(), name };
      }
    }
    throw new Error(`unparsed ingredient: ${line}`);
  }
  const qty = parseNumber(match[1] ?? "");
  const unit = unitKey(match[2] ?? "");
  const name = (match[3] ?? "").trim();
  if (!qty || qty <= 0 || !name) throw new Error(`unparsed ingredient: ${line}`);

  const canOz = line.match(/can[^(]*\((\d+(?:\.\d+)?)\s*ounces?\)/i);
  if (unit === "can" && canOz?.[1]) {
    return {
      grams: Math.round(qty * Number(canOz[1]) * 28.35),
      household: line.trim(),
      name,
    };
  }

  let grams: number;
  if (unit === "tablespoon" || unit === "teaspoon" || unit === "cup") {
    grams = qty * ML[unit] * densityFor(name);
  } else if (unit === "ounce") {
    grams = qty * 28.35;
  } else if (unit === "pound") {
    grams = qty * 453.6;
  } else if (unit === "gram") {
    grams = qty;
  } else if (unit === "ml") {
    grams = qty * densityFor(name);
  } else if (unit === "clove") {
    grams = qty * (COUNT_GRAMS.clove ?? 3);
  } else if (COUNT_GRAMS[name.toLowerCase()]) {
    grams = qty * COUNT_GRAMS[name.toLowerCase()]!;
  } else {
    throw new Error(`unparsed ingredient: ${line}`);
  }

  return { grams: Math.round(grams), household: line.trim(), name };
}
