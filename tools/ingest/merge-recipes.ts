import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { readCache } from "../nutrition/cache";
import {
  mergeRecipes,
  type CatalogRecipeRow,
  type IngestRecipeDraft,
} from "./recipes";

const CATALOG_PATH = new URL("../../data/recipes.json", import.meta.url);
const DRAFTS_PATH = new URL("../../data/ingest/recipe-drafts.json", import.meta.url);

export function mergeRecipeDraftsIntoCatalog(
  draftsPath = DRAFTS_PATH,
  catalogPath = CATALOG_PATH,
): { added: string[]; skipped: string[]; total: number } {
  if (!existsSync(draftsPath)) {
    throw new Error("recipe drafts JSON is missing");
  }
  const drafts = JSON.parse(readFileSync(draftsPath, "utf8")) as IngestRecipeDraft[];
  const existing = existsSync(catalogPath)
    ? (JSON.parse(readFileSync(catalogPath, "utf8")) as CatalogRecipeRow[])
    : [];
  const result = mergeRecipes(existing, drafts, readCache());
  writeFileSync(catalogPath, `${JSON.stringify(result.recipes, null, 2)}\n`);
  return {
    added: result.added,
    skipped: result.skipped,
    total: result.recipes.length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = mergeRecipeDraftsIntoCatalog();
  console.log(
    `ingest recipes: added ${result.added.length}, skipped ${result.skipped.length}, catalog ${result.total}`,
  );
  if (result.added.length) console.log(`  added: ${result.added.join(", ")}`);
}
