import assert from "node:assert/strict";
import test from "node:test";

import type { EngineSuccess } from "../engine/types.ts";
import { SignedOutError } from "./errors.ts";
import { DEFAULT_OWNER_ID } from "./owner.ts";
import {
  assertEveryCallScopedTo,
  createRecordingClient,
} from "./recording-client.ts";
import { commitPlanVersion } from "./plans.ts";

const SESSION_ID = "11111111-2222-4333-8444-555555555555";

const success = {
  ok: true,
  ageYears: 36,
  bmrKcal: 1817.5,
  pal: 1.55,
  tdeeKcal: 2817.125,
  impliedWeeklyLossPct: 0.5681818181818182,
  dailyDeficitKcal: 550,
  energyKcal: 2270,
  proteinG: 161,
  fatG: 70,
  carbG: 249,
  macroChecksumKcal: 2270,
  warnings: [],
  splitId: "upper_lower",
  trainingDaysPerWeek: 4,
  trainDaySettings: ["gym", "rest", "bands", "rest", "gym", "home", "rest"],
  cardio: { kind: "zone2", sessionsPerWeek: 2 },
  deloadWeeks: [4, 8, 12, 16],
} satisfies EngineSuccess;

const payload = {
  profile: {
    sex: "male" as const,
    birthDate: "1990-03-15",
    heightCm: 178,
    weightKg: 88,
    bodyFatPct: 22,
    skeletalMuscleMassKg: 36.5,
    dietFlags: ["vegetarian"],
    kitchenFlags: ["batch_cook"],
    servings: 1,
  },
  trainingDays: [
    { weekday: "mon" as const, setting: "gym" as const },
    { weekday: "wed" as const, setting: "bands" as const },
  ],
  goal: {
    type: "fat_loss" as const,
    startOn: "2026-08-18",
    endOn: "2026-12-08",
    targetWeightKg: 80,
    weeklyLossCapPct: 1,
  },
  result: success,
  generatorInput: { source: "onboarding" },
};

test("commitPlanVersion throws and issues no query when signed out", async () => {
  const client = createRecordingClient({ userId: null });
  await assert.rejects(() => commitPlanVersion(payload, client), SignedOutError);
  assert.equal(client.calls.length, 0);
});

test("commitPlanVersion stamps session owner_id on goal, plan, and plan_versions", async () => {
  const client = createRecordingClient({ userId: SESSION_ID, data: null });
  const committed = await commitPlanVersion(payload, client);
  assert.ok(committed.planVersionId);
  const tables = client.calls.filter(
    (call) => call.op === "insert" || call.op === "upsert",
  );
  const version = tables.find((call) => call.table === "plan_versions");
  assert.ok(version);
  for (const row of version.rows) {
    const typed = row as {
      owner_id: string;
      energy_kcal: number;
      protein_g: number;
    };
    assert.equal(typed.owner_id, SESSION_ID);
    assert.notEqual(typed.owner_id, DEFAULT_OWNER_ID);
    assert.equal(typed.energy_kcal, 2270);
    assert.equal(typed.protein_g, 161);
  }
  assertEveryCallScopedTo(client.calls, SESSION_ID);
});

test("commitPlanVersion assigns USDA catalog meals for 3 days and skips meat on vegetarian", async () => {
  const client = createRecordingClient({ userId: SESSION_ID, data: null });
  await commitPlanVersion(payload, client);
  const days = client.calls.filter((call) => call.table === "day_plans" && call.op === "insert");
  assert.equal(days.length, 3);
  const meals = client.calls.filter((call) => call.table === "meal_slots" && call.op === "insert");
  const slugs = meals.flatMap((call) =>
    call.rows.map((row) => (row as { recipe_slug: string }).recipe_slug),
  );
  assert.equal(slugs.length, 12);
  assert.ok(slugs.every((slug) => !slug.startsWith("dummy-")));
  assert.ok(slugs.every((slug) => !/chicken|salmon|tuna/i.test(slug)));
  assert.ok(slugs.every((slug) => !slug.startsWith("empty-")));
});
