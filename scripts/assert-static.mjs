import { readFileSync } from "node:fs";

const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
const envExample = readFileSync(new URL("../.env.example", import.meta.url), "utf8");

const required = [
  "output: \"export\"",
  "trailingSlash: true",
  "unoptimized: true",
  "BASE_PATH",
];

for (const token of required) {
  if (!config.includes(token)) {
    console.error(`next.config.ts missing ${token}`);
    process.exit(1);
  }
}

if (!envExample.includes("NEXT_PUBLIC_SUPABASE_URL")) {
  console.error(".env.example missing NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}
if (!envExample.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
  console.error(".env.example missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}
if (!envExample.includes("USDA_FDC_API_KEY")) {
  console.error(".env.example missing USDA_FDC_API_KEY");
  process.exit(1);
}
if (/NEXT_PUBLIC_.*USDA|USDA.*NEXT_PUBLIC/.test(envExample)) {
  console.error("USDA_FDC_API_KEY must not be a NEXT_PUBLIC_ variable");
  process.exit(1);
}
if (envExample.includes("service_role") && !envExample.includes("Never put service_role")) {
  console.error("Do not document a service_role web env");
  process.exit(1);
}

console.log("static export + env example contract ok");
