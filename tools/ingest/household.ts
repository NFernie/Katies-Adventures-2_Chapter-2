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

const KNOWN_UNITS = new Set([
  "tablespoon",
  "teaspoon",
  "cup",
  "ounce",
  "pound",
  "gram",
  "ml",
  "can",
  "clove",
  "slice",
]);

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
  eggs: 50,
  clove: 3,
  cloves: 3,
  "chicken breast": 170,
  "chicken breasts": 170,
  banana: 118,
  bananas: 118,
  apple: 182,
  apples: 182,
  orange: 131,
  lemon: 58,
  lime: 67,
  onion: 110,
  tomato: 123,
  avocado: 150,
  potato: 213,
  carrot: 61,
  pepper: 119,
  tortilla: 45,
  slice: 28,
  slices: 28,
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
  if (["slice", "slices"].includes(u)) return "slice";
  return u;
}

function densityFor(name: string): number {
  const lower = name.toLowerCase();
  for (const [key, density] of Object.entries(DENSITY)) {
    if (lower.includes(key)) return density;
  }
  return 1;
}

function inferCountGrams(name: string): number {
  const n = name.toLowerCase();
  const hit = Object.entries(COUNT_GRAMS).find(([key]) => n.includes(key));
  if (hit) return hit[1];
  return 100;
}

function normalizeLine(line: string): string {
  return line
    .replace(/(\d)½/g, "$1 1/2")
    .replace(/(\d)¼/g, "$1 1/4")
    .replace(/(\d)¾/g, "$1 3/4")
    .replace(/(\d)⅓/g, "$1 1/3")
    .replace(/(\d)⅔/g, "$1 2/3")
    .replace(/½/g, "1/2")
    .replace(/¼/g, "1/4")
    .replace(/¾/g, "3/4")
    .replace(/⅓/g, "1/3")
    .replace(/⅔/g, "2/3")
    .replace(/^optional[:\s]+/i, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Salt/pepper/spray lines with no usable amount — skip, do not invent grams. */
export function isSkippableIngredientLine(line: string): boolean {
  const n = normalizeLine(line).toLowerCase();
  if (!n) return true;
  if (/to taste|as needed|for garnish|for serving/.test(n)) return true;
  if (/^(salt|pepper|black pepper|white pepper|cooking spray|nonstick spray|non-stick spray)\b/.test(n)) {
    return !/^\d/.test(n);
  }
  return false;
}

export function householdToGrams(line: string): HouseholdParse {
  const cleaned = normalizeLine(line);
  const match = cleaned.match(
    /^((?:\d+\s+\d+\/\d+)|(?:\d+\/\d+)|\d+(?:\.\d+)?)\s+([A-Za-z]+)\s+(.*)$/,
  );
  if (!match) {
    const count = cleaned.match(/^((?:\d+\s+\d+\/\d+)|(?:\d+\/\d+)|\d+(?:\.\d+)?)\s+(.*)$/);
    if (count) {
      const qty = parseNumber(count[1] ?? "");
      const name = (count[2] ?? "").trim();
      if (qty && qty > 0 && name) {
        return { grams: Math.round(qty * inferCountGrams(name)), household: line.trim(), name };
      }
    }
    throw new Error(`unparsed ingredient: ${line}`);
  }
  const qty = parseNumber(match[1] ?? "");
  const unitRaw = match[2] ?? "";
  const unit = unitKey(unitRaw);
  const rest = (match[3] ?? "").trim();
  if (!qty || qty <= 0) throw new Error(`unparsed ingredient: ${line}`);

  if (!KNOWN_UNITS.has(unit)) {
    const name = `${unitRaw} ${rest}`.trim();
    if (!name) throw new Error(`unparsed ingredient: ${line}`);
    return { grams: Math.round(qty * inferCountGrams(name)), household: line.trim(), name };
  }

  const name = rest;
  if (!name) throw new Error(`unparsed ingredient: ${line}`);

  const canOz = line.match(/can[^(]*\((\d+(?:\.\d+)?)\s*ounces?\)/i)
    ?? line.match(/\((\d+(?:\.\d+)?)\s*ounces?\)[^(]*can/i);
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
  } else if (unit === "slice") {
    grams = qty * inferCountGrams(name);
  } else if (unit === "can") {
    grams = qty * 400;
  } else {
    throw new Error(`unparsed ingredient: ${line}`);
  }

  return { grams: Math.round(grams), household: line.trim(), name };
}
