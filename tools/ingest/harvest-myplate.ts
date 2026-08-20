import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { readCache, writeCache } from "../nutrition/cache";
import {
  fetchFirstAvailableFood,
  readUsdaKey,
  searchFdcFoods,
} from "../nutrition/fdc";
import { householdToGrams, isSkippableIngredientLine } from "./household";
import { inferAllergens, inferDietTags } from "./myplate-diet";
import {
  parseMyPlateHtml,
  sourceAttribution,
  type MyPlateCourse,
  type ParsedMyPlateRecipe,
} from "./myplate-html";
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
const WAYBACK_STAMPS = [
  "20250124221018id_",
  "20250117181741id_",
  "20241215000000id_",
  "20250101000000id_",
];
const CACHE_DIR = join(fileURLToPath(new URL("../../.cache/myplate/", import.meta.url)));
const POOL_PATH = join(CACHE_DIR, "pool.json");
const CATALOG_PATH = new URL("../../data/recipes.json", import.meta.url);
const RAW_PATH = new URL("../../data/ingest/myplate-raw.json", import.meta.url);
const DRAFTS_PATH = new URL("../../data/ingest/recipe-drafts.json", import.meta.url);

type IndexQuery = { course: MyPlateCourse; path: string };

type HarvestPoolRow = SelectCandidate & {
  draft: IngestRecipeDraft;
  parsed: ParsedMyPlateRecipe;
};

const PHASES: Array<{
  label: string;
  queries: IndexQuery[];
  needed: (totals: ReturnType<typeof countCatalog>) => boolean;
}> = [
  {
    label: "breakfast",
    queries: [{ course: "breakfast", path: "/myplate-kitchen/recipes?f%5B0%5D=course%3A119" }],
    needed: (totals) =>
      totals.slots.breakfast < SLOT_TARGETS.breakfast || totals.veg.breakfast < VEG_TARGETS.breakfast,
  },
  {
    label: "snack",
    queries: [{ course: "snack", path: "/myplate-kitchen/recipes?f%5B0%5D=course%3A125" }],
    needed: (totals) => totals.slots.snack < SLOT_TARGETS.snack,
  },
  {
    label: "veg-main",
    queries: [
      {
        course: "main",
        path: "/myplate-kitchen/recipes?f%5B0%5D=course%3A121&f%5B1%5D=cuisine%3A139",
      },
    ],
    needed: (totals) =>
      totals.slots.lunch < SLOT_TARGETS.lunch ||
      totals.slots.dinner < SLOT_TARGETS.dinner ||
      totals.veg.lunch < VEG_TARGETS.lunch ||
      totals.veg.dinner < VEG_TARGETS.dinner,
  },
  {
    label: "main",
    queries: [{ course: "main", path: "/myplate-kitchen/recipes?f%5B0%5D=course%3A121" }],
    needed: (totals) =>
      totals.slots.lunch < SLOT_TARGETS.lunch ||
      totals.slots.dinner < SLOT_TARGETS.dinner ||
      totals.veg.lunch < VEG_TARGETS.lunch ||
      totals.veg.dinner < VEG_TARGETS.dinner,
  },
  {
    label: "soup-salad",
    queries: [
      { course: "soup", path: "/myplate-kitchen/recipes?f%5B0%5D=course%3A127" },
      { course: "salad", path: "/myplate-kitchen/recipes?f%5B0%5D=course%3A122" },
    ],
    needed: (totals) =>
      totals.slots.lunch < SLOT_TARGETS.lunch || totals.veg.lunch < VEG_TARGETS.lunch,
  },
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function originalRecipeUrl(slug: string): string {
  return `https://www.myplate.gov/recipes/${slug}`;
}

function waybackUrl(original: string, stamp = WAYBACK_STAMPS[0]): string {
  return `https://web.archive.org/web/${stamp}/${original}`;
}

function cacheKey(url: string): string {
  return url.replace(/https?:\/\//g, "").replace(/[^a-z0-9]+/gi, "-").slice(0, 180);
}

async function fetchText(url: string): Promise<string> {
  assertScrapeAllowed(url);
  const response = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" } });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
  return response.text();
}

function extractSlugs(html: string): string[] {
  const found = new Set<string>();
  for (const match of html.matchAll(/about="\/recipes\/([a-z0-9-]+)"/gi)) {
    const slug = match[1];
    if (slug && slug !== "search") found.add(slug);
  }
  if (found.size) return [...found];
  for (const match of html.matchAll(/\/recipes\/([a-z0-9-]+)/gi)) {
    const slug = match[1];
    if (slug && slug !== "search") found.add(slug);
  }
  return [...found];
}

function projectedTotals(
  existing: CatalogRecipeRow[],
  pool: SelectCandidate[],
): ReturnType<typeof countCatalog> {
  const selected = selectMyPlateAdds(existing, sortFillOrder(pool));
  return countCatalog([
    ...existing,
    ...selected.chosen.map((row) => ({ slots: row.slots, dietTags: row.dietTags })),
  ]);
}

function capsMet(existing: CatalogRecipeRow[], pool: SelectCandidate[]): boolean {
  const totals = projectedTotals(existing, pool);
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

function readJsonFile<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writePool(pool: HarvestPoolRow[]): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(POOL_PATH, `${JSON.stringify(pool, null, 2)}\n`);
}

async function cdxTimestamps(original: string): Promise<string[]> {
  const url =
    `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(original)}` +
    "&output=json&fl=timestamp,statuscode&filter=statuscode:200&from=20230101&to=20260301&limit=8";
  assertScrapeAllowed(url);
  await sleep(DELAY_MS);
  const response = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!response.ok) return [];
  const body = (await response.json()) as Array<[string, string]>;
  return body
    .slice(1)
    .map((row) => row[0])
    .filter((stamp) => /^\d{14}$/.test(stamp))
    .map((stamp) => `${stamp}id_`);
}

function readCachedHtml(paths: string[]): string | null {
  for (const file of paths) {
    try {
      const html = readFileSync(file, "utf8");
      if (html.length > 500) return html;
    } catch {
      /* next path */
    }
  }
  return null;
}

async function fetchWaybackHtml(original: string): Promise<{ html: string; sourceUrl: string }> {
  const stamps = [...WAYBACK_STAMPS];
  const slug = original.match(/\/recipes\/([a-z0-9-]+)$/i)?.[1];
  let lastError: unknown;
  for (const stamp of stamps) {
    const sourceUrl = waybackUrl(original, stamp);
    const html = readCachedHtml([
      join(CACHE_DIR, `${cacheKey(sourceUrl)}.html`),
      slug ? join(CACHE_DIR, `${slug}.html`) : "",
    ]);
    if (html) return { html, sourceUrl };
    try {
      await sleep(DELAY_MS);
      const html = await fetchText(sourceUrl);
      mkdirSync(CACHE_DIR, { recursive: true });
      writeFileSync(join(CACHE_DIR, `${cacheKey(sourceUrl)}.html`), html);
      if (slug) writeFileSync(join(CACHE_DIR, `${slug}.html`), html);
      if (html.length > 500) return { html, sourceUrl };
    } catch (error) {
      lastError = error;
    }
  }
  const extra = await cdxTimestamps(original);
  for (const stamp of extra) {
    if (stamps.includes(stamp)) continue;
    const sourceUrl = waybackUrl(original, stamp);
    try {
      await sleep(DELAY_MS);
      const html = await fetchText(sourceUrl);
      mkdirSync(CACHE_DIR, { recursive: true });
      writeFileSync(join(CACHE_DIR, `${cacheKey(sourceUrl)}.html`), html);
      if (slug) writeFileSync(join(CACHE_DIR, `${slug}.html`), html);
      if (html.length > 500) return { html, sourceUrl };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`no Wayback HTML for ${original}`);
}

async function collectIndexSlugs(queries: IndexQuery[], maxPages = 12): Promise<string[]> {
  const slugs: string[] = [];
  const seen = new Set<string>();
  mkdirSync(CACHE_DIR, { recursive: true });
  for (const query of queries) {
    for (let page = 0; page < maxPages; page += 1) {
      const original = `https://www.myplate.gov${query.path}${query.path.includes("?") ? "&" : "?"}page=${page}`;
      let html: string;
      try {
        html = (await fetchWaybackHtml(original)).html;
      } catch {
        break;
      }
      const pageSlugs = extractSlugs(html);
      console.log(`index ${query.course} page=${page} slugs=${pageSlugs.length}`);
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
    if (isSkippableIngredientLine(line)) continue;
    const household = householdToGrams(line);
    const query = household.name.toLowerCase();
    const cachedId = searchHits.get(query);
    const cachedFood = cachedId ? cache.foods[String(cachedId)] : undefined;
    if (cachedFood && cachedId) {
      ingredients.push({
        name: household.name,
        grams: household.grams,
        household: household.household,
        fdcId: cachedId,
        matchNote: `${cachedFood.dataType} ${cachedFood.description}`,
      });
      continue;
    }
    const hits = await searchFdcFoods(household.name, key);
    const food = await fetchFirstAvailableFood(hits, key, cache);
    if (!food) throw new Error(`no FDC hit for ${household.name}`);
    searchHits.set(query, food.fdcId);
    ingredients.push({
      name: household.name,
      grams: household.grams,
      household: household.household,
      fdcId: food.fdcId,
      matchNote: `${food.dataType} ${food.description}`,
    });
  }
  if (!ingredients.length) throw new Error("no usable ingredients");
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

async function ingestSlug(
  slug: string,
  existing: CatalogRecipeRow[],
  key: string,
  cache: ReturnType<typeof readCache>,
  searchHits: Map<string, number>,
  pool: HarvestPoolRow[],
  raw: ParsedMyPlateRecipe[],
): Promise<void> {
  if (existing.some((row) => row.slug === slug) || pool.some((row) => row.slug === slug)) {
    return;
  }
  const { html, sourceUrl } = await fetchWaybackHtml(originalRecipeUrl(slug));
  const parsed = parseMyPlateHtml(html, sourceUrl);
  raw.push(parsed);
  const draft = await draftFromParsed(parsed, sourceUrl, key, cache, searchHits);
  const enriched = enrichDraftWithUsda(draft, cache);
  if (!enriched.nutrition.checksumOk) throw new Error("checksum");
  if (
    !myplateEnergyAgrees(enriched.nutrition.kcal, parsed.servings, parsed.myplateKcalPerServing)
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
  writePool(pool);
  writeCache(cache);
  console.log(`ok ${parsed.slug} (${parsed.course}) pool=${pool.length}`);
}

function leftoverSnackRow(draft: IngestRecipeDraft, enriched: IngestRecipeDraft): HarvestPoolRow {
  return {
    slug: draft.slug,
    title: draft.title,
    course: "snack",
    dietTags: draft.dietTags,
    proteinPerServing: (enriched.nutrition?.proteinG ?? 0) / Math.max(draft.servings, 1),
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
  const pool = readJsonFile<HarvestPoolRow[]>(POOL_PATH, []);
  const raw: ParsedMyPlateRecipe[] = pool.map((row) => row.parsed);
  let fetched = 0;

  for (const phase of PHASES) {
    const totals = projectedTotals(existing, pool);
    if (!phase.needed(totals)) {
      console.log(`skip phase ${phase.label}: caps already covered`);
      continue;
    }
    const slugs = await collectIndexSlugs(phase.queries);
    console.log(`phase ${phase.label} unique slugs=${slugs.length}`);
    for (const slug of slugs) {
      if (options.maxFetch && fetched >= options.maxFetch) break;
      fetched += 1;
      try {
        await ingestSlug(slug, existing, key, cache, searchHits, pool, raw);
      } catch (error) {
        console.log(`skip ${slug}: ${error instanceof Error ? error.message : error}`);
      }
      if (capsMet(existing, pool) && !options.maxFetch) break;
    }
    if (capsMet(existing, pool) && !options.maxFetch) break;
  }

  writeCache(cache);
  mkdirSync(dirname(fileURLToPath(RAW_PATH)), { recursive: true });
  writeFileSync(RAW_PATH, `${JSON.stringify(raw, null, 2)}\n`);

  const leftover = JSON.parse(readFileSync(DRAFTS_PATH, "utf8")) as IngestRecipeDraft[];
  for (const draft of leftover) {
    if (!draft.slots.includes("snack")) continue;
    if (existing.some((row) => row.slug === draft.slug) || pool.some((row) => row.slug === draft.slug)) {
      continue;
    }
    try {
      const enriched = enrichDraftWithUsda(draft, cache);
      pool.push(leftoverSnackRow(draft, enriched));
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
