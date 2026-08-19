import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));

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

test("docs/launch.md records Pages URL, lock redirect, RLS, and secret names", () => {
  const text = readFileSync(join(root, "docs/launch.md"), "utf8");
  assert.match(text, /https:\/\/nfernie\.github\.io\/Katies-Adventures-2_Chapter-2\//);
  assert.match(text, /\/lock\//);
  assert.match(text, /auth\.uid\(\)/);
  assert.match(text, /owner_id = auth\.uid\(\)/);
  assert.match(text, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(text, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.match(text, /USDA_FDC_API_KEY/);
  assert.match(text, /service_role/);
});

test("layout and robots.txt ask crawlers not to index", () => {
  const layout = readFileSync(join(root, "src/app/layout.tsx"), "utf8");
  const robots = readFileSync(join(root, "public/robots.txt"), "utf8");
  assert.match(layout, /index:\s*false/);
  assert.match(layout, /follow:\s*false/);
  assert.match(robots, /User-agent:\s*\*/);
  assert.match(robots, /Disallow:\s*\//);
});

test("src/ does not invent NextAuth or a second login wall", () => {
  const files = walk(join(root, "src"));
  const offenders: string[] = [];
  for (const file of files) {
    if (file.endsWith(".test.ts")) continue;
    const text = readFileSync(file, "utf8");
    if (/NextAuth|next-auth|Auth\.js/.test(text)) offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});

test("prefers-reduced-motion is in globals.css", () => {
  const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("AppShell skip link and footer disclaimer; generate still has Disclaimer", () => {
  const shell = readFileSync(join(root, "src/components/shell/app-shell.tsx"), "utf8");
  const onboarding = readFileSync(
    join(root, "src/components/onboarding/onboarding-flow.tsx"),
    "utf8",
  );
  assert.match(shell, /href="#main"/);
  assert.match(shell, /Skip to main content/);
  assert.match(shell, /<Disclaimer \/>/);
  assert.match(onboarding, /<Disclaimer \/>/);
});
