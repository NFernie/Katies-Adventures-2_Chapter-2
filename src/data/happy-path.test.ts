import assert from "node:assert/strict";
import test from "node:test";

import { CATALOG_RECIPES } from "../catalog/recipes.ts";
import { previewRemainingTimeline } from "../engine/timeline.ts";
import type { EngineSuccess } from "../engine/types.ts";
import { upsertCheckIn } from "./check-ins.ts";
import { completeWorkoutItem } from "./workouts.ts";
import {
  listDayPlans,
  listPlanVersions,
  commitPlanVersion,
} from "./plans.ts";
import {
  listMealSlotsForDay,
  pinMealSlot,
  swapMealSlot,
} from "./meals.ts";
import { listWorkoutItems, listWorkoutSessionForDay } from "./workouts.ts";
import { createMemoryClient } from "./memory-client.ts";

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
    { weekday: "fri" as const, setting: "gym" as const },
    { weekday: "sat" as const, setting: "home" as const },
  ],
  goal: {
    type: "fat_loss" as const,
    startOn: "2026-08-18",
    endOn: "2026-12-08",
    targetWeightKg: 80,
    weeklyLossCapPct: 1,
  },
  result: success,
  generatorInput: {
    source: "onboarding",
    startOn: "2026-08-18",
    endOn: "2026-12-08",
    targetWeightKg: 80,
  },
};

test("stubbed session happy path: onboard, swap, complete, check-in, regenerate with pin", async () => {
  const client = createMemoryClient({ userId: SESSION_ID });

  await commitPlanVersion(payload, client);
  const days = await listDayPlans(client);
  assert.equal(days.length, 3);
  const meals = await listMealSlotsForDay(days[0]?.id ?? "", client);
  const dinner = meals.find((meal) => meal.slot === "dinner");
  assert.ok(dinner);
  const alt = CATALOG_RECIPES.find(
    (row) =>
      row.slug !== dinner.recipeSlug &&
      row.slots.includes("dinner") &&
      (row.dietTags.includes("vegetarian") || row.dietTags.includes("vegan")) &&
      row.kitchenTags.includes("batch_cook") &&
      !/chicken|salmon|tuna/i.test(row.slug),
  );
  assert.ok(alt);
  await swapMealSlot(dinner.id, alt.slug, client);
  await pinMealSlot(dinner.id, true, client);

  const trainDay = days.find((day) => day.isTrainDay) ?? days[0];
  assert.ok(trainDay);
  const session = await listWorkoutSessionForDay(trainDay.id, client);
  if (session) {
    const items = await listWorkoutItems(session.id, client);
    if (items[0]) await completeWorkoutItem(items[0].id, client);
  }

  await upsertCheckIn(
    {
      loggedOn: "2026-08-19",
      weightKg: 87.2,
      bodyFatPct: 21.5,
      skeletalMuscleMassKg: 36.4,
    },
    client,
  );

  const preview = previewRemainingTimeline({
    currentWeightKg: 87.2,
    targetWeightKg: 80,
    asOf: "2026-08-19",
    endOn: "2026-12-08",
    weeklyLossCapPct: 1,
  });
  assert.equal(preview.ok, true);

  await commitPlanVersion({ ...payload, keepPins: true }, client);
  const versions = await listPlanVersions(client);
  assert.equal(versions.length, 2);
  assert.equal(versions[0]?.versionN, 2);
  assert.equal(versions[0]?.planId, versions[1]?.planId);
  assert.equal(client.store.plan_versions.length, 2);
  assert.equal(client.store.plans.length, 1);
  assert.equal(
    client.store.plan_versions.filter((row) => !row.id).length,
    0,
  );

  const latestDays = daysFor(client, versions[0]?.id ?? "");
  const previousDays = daysFor(client, versions[1]?.id ?? "");
  assert.equal(previousDays.length, 3);
  assert.equal(latestDays.length, 3);
  const regenerated = await listMealSlotsForDay(latestDays[0]?.id ?? "", client);
  assert.equal(
    regenerated.find((meal) => meal.slot === "dinner")?.recipeSlug,
    alt.slug,
  );
});

function daysFor(
  client: ReturnType<typeof createMemoryClient>,
  planVersionId: string,
) {
  return client.store.day_plans.filter(
    (row) => row.plan_version_id === planVersionId,
  );
}
