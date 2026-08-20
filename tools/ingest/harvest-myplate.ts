import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { readCache, writeCache } from "../nutrition/cache";
import { fetchFdcFood, readUsdaKey, searchFdcFoods } from "../nutrition/fdc";
import { inferAllergens, inferDietTags } from "./myplate-diet";
import {
  parseMyPlateHtml,
  sourceAttribution,
  type MyPlateCourse,
  type ParsedMyPlateRecipe,
} from "./myplate-html";
import { householdToGrams } from "./household";
import {
  SLOT_TARGETS,
  VEG_TARGETS,
  countCatalog,
  myplateEnergyAgrees,
  selectMyPlateAdds,
  sortFillOrder,
  type SelectCandidate,
} from "./myplate-select";
import {
  enrichDraftWithUsda,
  mergeRecipes,
  type CatalogRecipeRow,
  type IngestRecipeDraft,
} from "./recipes";
import { assertScrapeAllowed } from "./sources";

const UA = "BodyPlanMyPlateIngest/0.1 (+https://github.com/NFernie/Katies-Adventures-2_Chapter-2)";
const DELAY_MS = 2200;
const WAYBACK_PREFIX = "https://web.archive.org/web/20250101000000id_/";
const CACHE_DIR = join(fileURLToPath(new URL("../../.cache/myplate/", import.meta.url)));
const CATALOG_PATH = new URL("../../data/recipes.json", import.meta.url);
const RAW_PATH = new URL("../../data/ingest/myplate-raw.json", import.meta.url);
const DRAFTS_PATH = new URL("../../data/ingest/recipe-drafts.json", import.meta.url);

const INDEX_QUERIES: Array<{ course: MyPlateCourse; path: string }> = [
  { course: "breakfast", path: "/myplate-kitchen/recipes?f%5B0%5D=course%3A119" },
  { course: "snack", path: "/myplate-kitchen/recipes?f%5B0%5D=course%3A125" },
  { course: "main", path: "/myplate-kitchen/recipes?f%5B0%5D=course%3A121&f%5B1%5D=cuisine%3A139" },
  { course: "main", path: "/myplate-kitchen/recipes?f%5B0%5D=course%3A121" },
  { course: "soup", path: "/myplate-kitchen/recipes?f%5B0%5D=course%3A127" },
  { course: "salad", path: "/myplate-kitchen/recipes?f%5B0%5D=course%3A122" },
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function originalRecipeUrl(slug: string): string {
  return `https://www.myplate.gov/recipes/${slug}`;
}

function waybackUrl(original: string): string {
  return `${WAYBACK_PREFIX}${original}`;
}

async function fetchText(url: string): Promise<string> {
  assertScrapeAllowed(url);
  const response = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" } });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
  return response.text();
}

function extractSlugs(html: string): string[] {
  const found = new Set<string>();
  for (const match of html.matchAll(/\/recipes\/([a-z0-9-]+)/gi)) {
    const slug = match[1];
    if (slug && slug !== "search") found.add(slug);
  }
  return [...found];
}

function capsMet(existing: CatalogRecipeRow[], pool: SelectCandidate[]): boolean {
  const selected = selectMyPlateAdds(existing, sortFillOrder(pool));
  const totals = countCatalog([
    ...existing,
    ...selected.chosen.map((row) => ({ slots: row.slots, dietTags: row.dietTags })),
  ]);
  return (
    totals.slots.breakfast >= SLOT_TARGETS.breakfast &&
    totals.slots.lunch >= SLOT_TARGETS.lunch &&
    totals.slots.dinner >= SLOT_TARGETS.dinner &&
    totals.slots.snack >= SLOT_TARGETS.snack &&
    totals.veg.breakfast >= VEG_TARGETS.breakfast &&
    totals.veg.lunch >= VEG_TARGETS.lunch &&
    totals.veg.dinner >= VEG_TARGETS.dinner
  );
}

async function collectIndexSlugs(maxPages = 12): Promise<string[]> {
  const slugs: string[] = [];
  const seen = new Set<string>();
  mkdirSync(CACHE_DIR, { recursive: true });
  for (const query of INDEX_QUERIES) {
    for (let page = 0; page < maxPages; page += 1) {
      const original = `https://www.myplate.gov${query.path}${query.path.includes("?") ? "&" : "?"}page=${page}`;
      const url = waybackUrl(original);
      await sleep(DELAY_MS);
      let html: string;
      try {
        html = await fetchText(url);
      } catch {
        break;
      }
      const pageSlugs = extractSlugs(html);
      if (!pageSlugs.length) break;
      let added = 0;
      for (const slug of pageSlugs) {
        if (seen.has(slug)) continue;
        seen.add(slug);
        slugs.push(slug);
        added += 1;
      }
      if (added === 0) break;
    }
  }
  return slugs;
}

async function loadHtml(slug: string): Promise<{ html: string; sourceUrl: string }> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const file = join(CACHE_DIR, `${slug}.html`);
  const sourceUrl = waybackUrl(originalRecipeUrl(slug));
  try {
    const html = readFileSync(file, "utf8");
    if (html.length > 500) return { html, sourceUrl };
  } catch {
    /* fetch */
  }
  await sleep(DELAY_MS);
  const html = await fetchText(sourceUrl);
  writeFileSync(file, html);
  return { html, sourceUrl };
}

function kitchenTags(parsed: ParsedMyPlateRecipe): string[] {
  return parsed.servings >= 4 ? ["batch_cook"] : [];
}

export async function draftFromParsed(
  parsed: ParsedMyPlateRecipe,
  sourceUrl: string,
  key: string,
  cache: ReturnType<typeof readCache>,
  searchHits: Map<string, number>,
): Promise<IngestRecipeDraft> {
  const ingredients = [];
  for (const line of parsed.ingredientLines) {
    const household = householdToGrams(line);
    const query = household.name.toLowerCase();
    let fdcId = searchHits.get(query);
    if (!fdcId) {
      const hits = await searchFdcFoods(household.name, key);
      const hit = hits[0];
      if (!hit) throw new Error(`no FDC hit for ${household.name}`);
      fdcId = hit.fdcId;
      searchHits.set(query, fdcId);
    }
    if (!cache.foods[String(fdcId)]) {
      cache.foods[String(fdcId)] = await fetchFdcFood(fdcId, key);
    }
    const food = cache.foods[String(fdcId)];
    ingredients.push({
      name: household.name,
      grams: household.grams,
      household: household.household,
      fdcId,
      matchNote: food ? `${food.dataType} ${food.description}` : undefined,
    });
  }
  const names = ingredients.map((row) => row.name);
  return {
    slug: parsed.slug,
    title: parsed.title,
    slots: [],
    dietTags: inferDietTags(names),
    allergens: inferAllergens(names),
    kitchenTags: kitchenTags(parsed),
    cookMinutes: parsed.cookMinutes,
    servings: parsed.servings,
    equipment: parsed.equipment,
    steps: parsed.steps,
    ingredients,
    sourceKind: "myplate-kitchen",
    license: "us-government-work",
    sourceUrl,
    sourceAttribution: sourceAttribution(parsed.contributor),
  };
}

export async function harvestMyPlate(options: { maxFetch?: number } = {}): Promise<{
  added: string[];
  skipped: string[];
  totals: ReturnType<typeof countCatalog>;
}> {
  const key = readUsdaKey();
  const cache = readCache();
  const existing = JSON.parse(readFileSync(CATALOG_PATH, "utf8")) as CatalogRecipeRow[];
  const searchHits = new Map<string, number>();
  const slugs = await collectIndexSlugs();
  const pool: Array<SelectCandidate & { draft: IngestRecipeDraft; parsed: ParsedMyPlateRecipe }> =
    [];
  const raw: ParsedMyPlateRecipe[] = [];
  let fetched = 0;

  for (const slug of slugs) {
    if (options.maxFetch && fetched >= options.maxFetch) break;
    try {
      const { html, sourceUrl } = await loadHtml(slug);
      fetched += 1;
      const parsed = parseMyPlateHtml(html, sourceUrl);
      raw.push(parsed);
      const draft = await draftFromParsed(parsed, sourceUrl, key, cache, searchHits);
      const enriched = enrichDraftWithUsda(draft, cache);
      if (!enriched.nutrition.checksumOk) throw new Error("checksum");
      if (
        !myplateEnergyAgrees(
          enriched.nutrition.kcal,
          parsed.servings,
          parsed.myplateKcalPerServing,
        )
      ) {
        throw new Error("myplate kcal mismatch");
      }
      pool.push({
        slug: parsed.slug,
        title: parsed.title,
        course: parsed.course,
        dietTags: draft.dietTags,
        proteinPerServing: enriched.nutrition.proteinG / Math.max(parsed.servings, 1),
        draft: enriched,
        parsed,
      });
      if (capsMet(existing, pool) && !options.maxFetch) break;
    } catch {
      /* exchange: skip and continue */
    }
  }

  writeCache(cache);
  mkdirSync(dirname(fileURLToPath(RAW_PATH)), { recursive: true });
  writeFileSync(RAW_PATH, `${JSON.stringify(raw, null, 2)}\n`);

  const leftover = JSON.parse(readFileSync(DRAFTS_PATH, "utf8")) as IngestRecipeDraft[];
  for (const draft of leftover) {
    if (!draft.slots.includes("snack")) continue;
    try {
      const enriched = enrichDraftWithUsda(draft, cache);
      pool.push({
        slug: draft.slug,
        title: draft.title,
        course: "snack",
        dietTags: draft.dietTags,
        proteinPerServing: enriched.nutrition.proteinG / Math.max(draft.servings, 1),
        draft: { ...enriched, sourceKind: draft.sourceKind ?? "first-party" },
        parsed: {
          slug: draft.slug,
          title: draft.title,
          course: "snack",
          servings: draft.servings,
          cookMinutes: draft.cookMinutes,
          equipment: draft.equipment,
          ingredientLines: [],
          steps: draft.steps,
          contributor: null,
          myplateKcalPerServing: null,
        },
      });
    } catch {
      /* skip leftover that cannot enrich */
    }
  }

  const ordered = sortFillOrder(pool);
  const selected = selectMyPlateAdds(existing, ordered);
  const bySlug = new Map(pool.map((row) => [row.slug, row]));
  const toMerge: IngestRecipeDraft[] = [];
  for (const row of selected.chosen) {
    const full = bySlug.get(row.slug);
    if (!full) continue;
    toMerge.push({ ...full.draft, slots: row.slots });
  }

  const merged = mergeRecipes(existing, toMerge, cache);
  writeFileSync(CATALOG_PATH, `${JSON.stringify(merged.recipes, null, 2)}\n`);
  return {
    added: merged.added,
    skipped: [...selected.skipped, ...merged.skipped],
    totals: countCatalog(merged.recipes),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const maxFetch = Number(process.env.MYPLATE_MAX_FETCH ?? "0") || undefined;
  harvestMyPlate({ maxFetch })
    .then((result) => {
      console.log(
        `myplate ingest: added ${result.added.length}, skipped ${result.skipped.length}`,
      );
      console.log(`slots ${JSON.stringify(result.totals.slots)} veg ${JSON.stringify(result.totals.veg)}`);
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
