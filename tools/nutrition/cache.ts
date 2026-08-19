import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import type { FdcCache } from "./types";

export const CACHE_PATH = new URL("../../data/nutrition/fdc-cache.json", import.meta.url);

export function emptyCache(): FdcCache {
  return { version: 1, foods: {} };
}

export function readCache(path = CACHE_PATH): FdcCache {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as FdcCache;
  } catch {
    return emptyCache();
  }
}

export function writeCache(cache: FdcCache, path = CACHE_PATH): void {
  const filePath = fileURLToPath(path);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(cache, null, 2)}\n`);
}
