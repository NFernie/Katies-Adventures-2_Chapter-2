import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const srcRoot = fileURLToPath(new URL("..", import.meta.url));

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full, acc);
    } else if (/\.(ts|tsx|js|mjs)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

test("only src/data may import supabase-js", () => {
  const files = walk(srcRoot);
  const offenders: string[] = [];
  for (const file of files) {
    if (file.includes(`${join("src", "data")}`)) continue;
    const text = readFileSync(file, "utf8");
    if (text.includes("@supabase/supabase-js") || text.includes("from(\"@supabase")) {
      offenders.push(file);
    }
  }
  assert.deepEqual(offenders, []);
});
