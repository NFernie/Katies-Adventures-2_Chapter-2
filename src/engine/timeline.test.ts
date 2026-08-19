import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { previewRemainingTimeline } from "./timeline.ts";

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
      weightKg: number;
      goal: {
        startOn: string;
        endOn: string;
        targetWeightKg: number;
        weeklyLossCapPct: number;
      };
    };
    expected: { impliedWeeklyLossPct: number };
  }>;
  unsafeBlock: {
    endOn: string;
    expected: {
      block: {
        impliedWeeklyLossPct: number;
        capPct: number;
        fastestSafeEndOn: string;
      };
    };
  };
};

const male = fixtures.examples.find((row) => row.id === "male-fat-loss-4d");
const female = fixtures.examples.find((row) => row.id === "female-retain-muscle-6d");
assert.ok(male);
assert.ok(female);

test("remaining timeline from start weight matches the locked male fixture pace", () => {
  const preview = previewRemainingTimeline({
    currentWeightKg: male.input.weightKg,
    targetWeightKg: male.input.goal.targetWeightKg,
    asOf: male.input.goal.startOn,
    endOn: male.input.goal.endOn,
    weeklyLossCapPct: male.input.goal.weeklyLossCapPct,
  });
  assert.equal(preview.ok, true);
  if (!preview.ok) return;
  assert.equal(preview.impliedWeeklyLossPct, male.expected.impliedWeeklyLossPct);
  assert.equal(preview.projectedEndWeightKg, 80);
  assert.equal(preview.capPct, 1);
});

test("timeline cap uses the locked unsafe fastest-safe date", () => {
  const preview = previewRemainingTimeline({
    currentWeightKg: female.input.weightKg,
    targetWeightKg: female.input.goal.targetWeightKg,
    asOf: female.input.goal.startOn,
    endOn: fixtures.unsafeBlock.endOn,
    weeklyLossCapPct: female.input.goal.weeklyLossCapPct,
  });
  assert.equal(preview.ok, false);
  if (preview.ok) return;
  assert.equal(preview.block.code, "unsafe_loss_speed");
  assert.equal(
    preview.block.impliedWeeklyLossPct,
    fixtures.unsafeBlock.expected.block.impliedWeeklyLossPct,
  );
  assert.equal(preview.block.capPct, fixtures.unsafeBlock.expected.block.capPct);
  assert.equal(
    preview.block.fastestSafeEndOn,
    fixtures.unsafeBlock.expected.block.fastestSafeEndOn,
  );
});

test("maintain with no target does not invent a loss timeline", () => {
  const preview = previewRemainingTimeline({
    currentWeightKg: 72,
    targetWeightKg: null,
    asOf: "2026-08-18",
    endOn: "2026-12-08",
    weeklyLossCapPct: 1,
  });
  assert.equal(preview.ok, true);
  if (!preview.ok) return;
  assert.equal(preview.impliedWeeklyLossPct, 0);
  assert.equal(preview.projectedEndWeightKg, 72);
});
