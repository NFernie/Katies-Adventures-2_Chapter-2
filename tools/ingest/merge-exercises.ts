import { existsSync, readFileSync, writeFileSync } from "node:fs";

import {
  formatExercisesJson,
  mergeExercises,
  type CatalogExerciseRow,
  type WgerExerciseInfo,
} from "./wger";

const CATALOG_PATH = new URL("../../data/exercises.json", import.meta.url);
const DRAFTS_PATH = new URL("../../data/ingest/wger-exerciseinfo.json", import.meta.url);

export function mergeWgerIntoCatalog(
  draftsPath = DRAFTS_PATH,
  catalogPath = CATALOG_PATH,
): { added: string[]; skipped: string[]; total: number } {
  if (!existsSync(draftsPath)) {
    throw new Error("wger exerciseinfo JSON is missing");
  }
  const incoming = JSON.parse(readFileSync(draftsPath, "utf8")) as WgerExerciseInfo[];
  const existing = existsSync(catalogPath)
    ? (JSON.parse(readFileSync(catalogPath, "utf8")) as CatalogExerciseRow[])
    : [];
  const result = mergeExercises(existing, incoming);
  writeFileSync(catalogPath, formatExercisesJson(result.exercises));
  return {
    added: result.added,
    skipped: result.skipped,
    total: result.exercises.length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = mergeWgerIntoCatalog();
  console.log(
    `ingest wger: added ${result.added.length}, skipped ${result.skipped.length}, catalog ${result.total}`,
  );
  if (result.added.length) console.log(`  added: ${result.added.join(", ")}`);
}
