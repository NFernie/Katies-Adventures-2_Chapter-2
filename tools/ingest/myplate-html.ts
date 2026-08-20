export type MyPlateCourse =
  | "breakfast"
  | "snack"
  | "main"
  | "soup"
  | "salad"
  | "dessert"
  | "sauce"
  | "bread"
  | "beverage"
  | "side"
  | "other";

export type ParsedMyPlateRecipe = {
  slug: string;
  title: string;
  course: MyPlateCourse;
  servings: number;
  cookMinutes: number;
  equipment: string[];
  ingredientLines: string[];
  steps: string[];
  contributor: string | null;
  myplateKcalPerServing: number | null;
};

const COURSE_ALIASES: Record<string, MyPlateCourse> = {
  breakfast: "breakfast",
  snack: "snack",
  snacks: "snack",
  "main dishes": "main",
  "main dish": "main",
  main: "main",
  soups: "soup",
  "soups & stews": "soup",
  soup: "soup",
  salads: "salad",
  salad: "salad",
  desserts: "dessert",
  dessert: "dessert",
  "sauces, condiments & dressings": "sauce",
  sauce: "sauce",
  breads: "bread",
  bread: "bread",
  beverages: "beverage",
  beverage: "beverage",
  "side dishes": "side",
  side: "side",
  sandwiches: "main",
  appetizers: "other",
};

const DROPPED_COURSES = new Set<MyPlateCourse>([
  "dessert",
  "sauce",
  "bread",
  "beverage",
]);

export function isDroppedCourse(course: MyPlateCourse): boolean {
  return DROPPED_COURSES.has(course);
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&quot;/gi, '"');
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(p|div|li|h1|h2|h3)>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function slugFromTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "myplate-recipe";
}

function parseJsonLd(html: string): Record<string, unknown> | null {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of blocks) {
    try {
      const data = JSON.parse(block[1] ?? "") as unknown;
      const nodes = Array.isArray(data)
        ? data
        : data && typeof data === "object" && "@graph" in data
          ? ((data as { "@graph": unknown[] })["@graph"] ?? [])
          : [data];
      for (const node of nodes) {
        if (node && typeof node === "object" && (node as { "@type"?: string })["@type"] === "Recipe") {
          return node as Record<string, unknown>;
        }
      }
    } catch {
      /* skip malformed ld+json */
    }
  }
  return null;
}

function taxonomyObject(html: string, key: string): string[] {
  const match = html.match(new RegExp(`["']?${key}["']?\\s*:\\s*\\{([^}]*)\\}`));
  if (!match?.[1]) return [];
  return [...match[1].matchAll(/"([^"]+)"/g)]
    .map((row) => row[1] ?? "")
    .filter((value) => /[A-Za-z]/.test(value));
}

function taxonomyCourses(html: string): string[] {
  return taxonomyObject(html, "course");
}

function taxonomyEquipment(html: string): string[] {
  return taxonomyObject(html, "cooking_equipment");
}

function mapEquipment(labels: string[]): string[] {
  const mapped = new Set<string>();
  for (const label of labels) {
    const lower = label.toLowerCase();
    if (lower.includes("stovetop") || lower.includes("skillet") || lower.includes("wok")) {
      mapped.add("hob");
    } else if (lower.includes("oven") && !lower.includes("toaster")) {
      mapped.add("oven");
    } else if (lower.includes("microwave")) {
      mapped.add("microwave");
    } else if (lower.includes("no cooking")) {
      mapped.add("none");
    }
  }
  if (mapped.size === 0) mapped.add("hob");
  return [...mapped];
}

function mapCourse(labels: string[]): MyPlateCourse {
  const mapped = labels
    .map((label) => COURSE_ALIASES[label.toLowerCase().trim()])
    .filter((course): course is MyPlateCourse => Boolean(course));
  const preferred: MyPlateCourse[] = ["breakfast", "snack", "main", "soup", "salad"];
  for (const want of preferred) {
    if (mapped.includes(want)) return want;
  }
  return mapped[0] ?? "other";
}

function fieldChunk(html: string, fieldName: string): string | null {
  const marker = `field--name-field-${fieldName}`;
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const from = html.slice(start);
  const next = from.slice(marker.length).search(/field--name-field-/);
  return next >= 0 ? from.slice(0, marker.length + next) : from;
}

function listItems(html: string, fieldName: string): string[] {
  const chunk = fieldChunk(html, fieldName);
  if (!chunk) return [];
  const items = [...chunk.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((row) =>
    stripTags(row[1] ?? ""),
  );
  return items.filter(Boolean);
}

function parseServings(html: string, ld: Record<string, unknown> | null): number {
  const yieldValue = ld?.recipeYield;
  if (typeof yieldValue === "string" || typeof yieldValue === "number") {
    const n = Number.parseInt(String(yieldValue).replace(/[^\d]/g, ""), 10);
    if (n > 0) return n;
  }
  const makes = html.match(/Makes:[\s\S]{0,80}?(\d+)\s*Servings/i);
  if (makes?.[1]) return Number(makes[1]);
  return 1;
}

function parseKcal(html: string, ld: Record<string, unknown> | null): number | null {
  const nutrition = ld?.nutrition;
  if (nutrition && typeof nutrition === "object" && "calories" in nutrition) {
    const n = Number.parseFloat(String((nutrition as { calories?: unknown }).calories));
    if (Number.isFinite(n) && n > 0) return n;
  }
  const cell = html.match(/Total Calories[\s\S]{0,80}?(\d+(?:\.\d+)?)/i);
  if (cell?.[1]) return Number(cell[1]);
  return null;
}

function parseContributor(html: string): string | null {
  const field = html.match(/field--name-field-source[\s\S]*?field__item[^>]*>([\s\S]*?)<\/span>/i);
  const text = stripTags(field?.[1] ?? "");
  if (!text) return null;
  return text.replace(/^source:\s*/i, "").trim() || null;
}

export function parseMyPlateHtml(html: string, sourceUrl = ""): ParsedMyPlateRecipe {
  const ld = parseJsonLd(html);
  const title =
    (typeof ld?.name === "string" && ld.name) ||
    stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "") ||
    "Untitled MyPlate recipe";
  const course = mapCourse(taxonomyCourses(html));
  const slugFromUrl = sourceUrl.match(/\/recipes\/([^/?#]+)/i)?.[1];
  const contributor = parseContributor(html);
  const ingredients = listItems(html, "ingredients");
  const steps = listItems(html, "instructions");
  if (!ingredients.length) {
    throw new Error(`no ingredients: ${title}`);
  }
  if (!steps.length) {
    throw new Error(`no steps: ${title}`);
  }
  return {
    slug: slugFromUrl || slugFromTitle(title),
    title,
    course,
    servings: parseServings(html, ld),
    cookMinutes: 20,
    equipment: mapEquipment(taxonomyEquipment(html)),
    ingredientLines: ingredients,
    steps,
    contributor,
    myplateKcalPerServing: parseKcal(html, ld),
  };
}

export function sourceAttribution(contributor: string | null): string {
  if (!contributor) return "USDA MyPlate Kitchen";
  return `USDA MyPlate Kitchen. ${contributor}`;
}
