import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const migration = readFileSync(
  fileURLToPath(new URL("../../supabase/migrations/0001_init.sql", import.meta.url)),
  "utf8",
);
const policies = readFileSync(
  fileURLToPath(new URL("../../supabase/policies.sql", import.meta.url)),
  "utf8",
);
const repair = readFileSync(
  fileURLToPath(
    new URL("../../supabase/migrations/0004_day_plans_training_setting.sql", import.meta.url),
  ),
  "utf8",
);

const personalTables = [
  "profiles",
  "training_days",
  "goals",
  "plans",
  "plan_versions",
  "day_plans",
  "meal_slots",
  "workout_sessions",
  "workout_items",
  "check_ins",
  "favorites",
];

test("RLS is owner_id = auth.uid() for authenticated; anon is revoked", () => {
  assert.match(migration, /owner_id = auth\.uid\(\)/);
  assert.match(migration, /revoke all on public\.%I from anon, public/);
  assert.match(migration, /for all to authenticated/);
  assert.match(policies, /authenticated: owner_id = auth\.uid\(\)/);
  assert.match(policies, /anon: revoked/);
  for (const table of personalTables) {
    assert.match(migration, new RegExp(`'${table}'`));
  }
});

test("no is_v1_owner open policy and no DEFAULT_OWNER_ID baked into RLS", () => {
  const executableSql = migration.replace(/--[^\n]*/g, "");
  assert.doesNotMatch(executableSql, /is_v1_owner/);
  assert.doesNotMatch(executableSql, /198e5a49-c748-4bcc-b6ad-86445a76eb7b/);
  assert.doesNotMatch(policies.replace(/--[^\n]*/g, ""), /is_v1_owner/);
  assert.match(policies, /DEFAULT_OWNER_ID is test\/fixture only/);
});

test("0004 adds day_plans.training_setting and reloads PostgREST", () => {
  assert.match(repair, /add column if not exists training_setting/);
  assert.match(repair, /notify pgrst,\s*'reload schema'/);
  assert.doesNotMatch(repair.replace(/--[^\n]*/g, ""), /is_v1_owner/);
});

test("0004 adds workout_sessions.setting only after checking the column exists", () => {
  const executable = repair.replace(/--[^\n]*/g, "");
  assert.match(repair, /workout_sessions/);
  assert.match(repair, /add column if not exists setting/);
  assert.match(executable, /information_schema\.columns/);
  assert.match(executable, /column_name = 'setting'/);
});
