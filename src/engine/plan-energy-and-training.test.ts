import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { planEnergyAndTraining } from "./plan-energy-and-training.ts";
import type { EngineBody, EngineGoal, EnginePrefs, Weekday } from "./types.ts";

const fixtures = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL("../../docs/domain/fixtures/engine-examples.json", import.meta.url),
    ),
    "utf8",
  ),
) as {
  examples: Array<{
    id: string;
    input: {
      sex: EngineBody["sex"];
      birthDate: string;
      heightCm: number;
      weightKg: number;
      bodyFatPct: number;
      skeletalMuscleMassKg: number;
      trainingWeek: EnginePrefs["trainingWeek"];
      goal: EngineGoal;
    };
    expected: Record<string, unknown>;
  }>;
  unsafeBlock: {
    endOn: string;
    expected: {
      ok: false;
      block: {
        code: string;
        impliedWeeklyLossPct: number;
        capPct: number;
        fastestSafeEndOn: string;
      };
    };
  };
};

const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function toArgs(input: (typeof fixtures.examples)[0]["input"]): {
  body: EngineBody;
  goal: EngineGoal;
  prefs: EnginePrefs;
} {
  return {
    body: {
      sex: input.sex,
      birthDate: input.birthDate,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      bodyFatPct: input.bodyFatPct,
      skeletalMuscleMassKg: input.skeletalMuscleMassKg,
    },
    goal: input.goal,
    prefs: {
      trainingWeek: input.trainingWeek,
      dietFlags: ["vegetarian"],
      kitchenFlags: ["batch_cook"],
      servings: 1,
    },
  };
}

function successFields(result: ReturnType<typeof planEnergyAndTraining>) {
  assert.equal(result.ok, true);
  if (!result.ok) return null;
  return {
    ok: result.ok,
    ageYears: result.ageYears,
    bmrKcal: result.bmrKcal,
    pal: result.pal,
    tdeeKcal: result.tdeeKcal,
    impliedWeeklyLossPct: result.impliedWeeklyLossPct,
    dailyDeficitKcal: result.dailyDeficitKcal,
    energyKcal: result.energyKcal,
    proteinG: result.proteinG,
    fatG: result.fatG,
    carbG: result.carbG,
    macroChecksumKcal: result.macroChecksumKcal,
    warnings: result.warnings,
    splitId: result.splitId,
    trainingDaysPerWeek: result.trainingDaysPerWeek,
    trainDaySettings: result.trainDaySettings,
    cardio: result.cardio,
    deloadWeeks: result.deloadWeeks,
  };
}

test("male fat-loss 4-day mixed week matches locked kcal/macro literals", () => {
  const example = fixtures.examples.find((row) => row.id === "male-fat-loss-4d");
  assert.ok(example);
  const result = planEnergyAndTraining(toArgs(example.input));
  const got = successFields(result);
  assert.equal(got?.energyKcal, 2270);
  assert.equal(got?.proteinG, 161);
  assert.equal(got?.fatG, 70);
  assert.equal(got?.carbG, 249);
  assert.equal(got?.macroChecksumKcal, 2270);
  assert.equal(got?.bmrKcal, example.expected.bmrKcal);
  assert.equal(got?.pal, 1.55);
  assert.equal(got?.tdeeKcal, example.expected.tdeeKcal);
  assert.equal(got?.ageYears, 36);
  assert.equal(got?.splitId, "upper_lower");
  assert.equal(got?.trainingDaysPerWeek, 4);
  assert.deepEqual(got?.trainDaySettings, example.expected.trainDaySettings);
  assert.deepEqual(got?.cardio, { kind: "zone2", sessionsPerWeek: 2 });
  assert.deepEqual(got?.deloadWeeks, [4, 8, 12, 16]);
  assert.deepEqual(got?.warnings, []);
  assert.equal(got?.impliedWeeklyLossPct, example.expected.impliedWeeklyLossPct);
  assert.equal(got?.dailyDeficitKcal, 550);
});

test("female retain-muscle 6-day mixed week matches locked kcal/macro literals", () => {
  const example = fixtures.examples.find(
    (row) => row.id === "female-retain-muscle-6d",
  );
  assert.ok(example);
  const result = planEnergyAndTraining(toArgs(example.input));
  const got = successFields(result);
  assert.equal(got?.energyKcal, 1930);
  assert.equal(got?.proteinG, 158);
  assert.equal(got?.fatG, 58);
  assert.equal(got?.carbG, 194);
  assert.equal(got?.macroChecksumKcal, 1930);
  assert.equal(got?.bmrKcal, example.expected.bmrKcal);
  assert.equal(got?.pal, 1.725);
  assert.equal(got?.tdeeKcal, example.expected.tdeeKcal);
  assert.equal(got?.ageYears, 31);
  assert.equal(got?.splitId, "ppl_twice");
  assert.equal(got?.trainingDaysPerWeek, 6);
  assert.deepEqual(got?.trainDaySettings, example.expected.trainDaySettings);
  assert.deepEqual(got?.cardio, { kind: "zone2", sessionsPerWeek: 1 });
  assert.deepEqual(got?.deloadWeeks, [4, 8, 12]);
  assert.deepEqual(got?.warnings, []);
});

test("unsafe loss speed blocks and offers the fastest safe date literal", () => {
  const female = fixtures.examples.find(
    (row) => row.id === "female-retain-muscle-6d",
  );
  assert.ok(female);
  const args = toArgs(female.input);
  args.goal = { ...args.goal, endOn: fixtures.unsafeBlock.endOn };
  const result = planEnergyAndTraining(args);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.block.code, "unsafe_loss_speed");
  assert.equal(
    result.block.impliedWeeklyLossPct,
    fixtures.unsafeBlock.expected.block.impliedWeeklyLossPct,
  );
  assert.equal(result.block.capPct, 1.0);
  assert.equal(result.block.fastestSafeEndOn, "2026-10-16");
});

test("diet flags do not change locked energy maths", () => {
  const example = fixtures.examples.find((row) => row.id === "male-fat-loss-4d");
  assert.ok(example);
  const args = toArgs(example.input);
  args.prefs = {
    ...args.prefs,
    dietFlags: ["vegan", "allergy_nuts"],
    kitchenFlags: ["eating_out_days"],
    servings: 4,
  };
  const result = planEnergyAndTraining(args);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.energyKcal, 2270);
  assert.equal(result.proteinG, 161);
});

test("all-rest week is a form error, not a generator block", () => {
  const example = fixtures.examples.find((row) => row.id === "male-fat-loss-4d");
  assert.ok(example);
  const args = toArgs(example.input);
  args.prefs = {
    ...args.prefs,
    trainingWeek: Object.fromEntries(WEEKDAYS.map((day) => [day, "rest"])) as EnginePrefs["trainingWeek"],
  };
  assert.throws(() => planEnergyAndTraining(args), /train day/i);
});
