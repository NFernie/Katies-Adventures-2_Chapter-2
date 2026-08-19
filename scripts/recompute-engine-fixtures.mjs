#!/usr/bin/env node
/**
 * Independent recompute of docs/domain/fixtures/engine-examples.json.
 * Does not import src/engine. Expected values must stay the JSON literals.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const fixtures = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../docs/domain/fixtures/engine-examples.json", import.meta.url)),
    "utf8",
  ),
);

function roundHalfUp(value, digits = 0) {
  const factor = 10 ** digits;
  const scaled = value * factor;
  const rounded = scaled >= 0 ? Math.floor(scaled + 0.5) : Math.ceil(scaled - 0.5);
  return rounded / factor;
}

function utcDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function daysBetween(start, end) {
  return Math.round((utcDate(end) - utcDate(start)) / 86400000);
}

function addDays(iso, n) {
  const t = utcDate(iso) + n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

function ageYears(birth, asOf) {
  const [by, bm, bd] = birth.split("-").map(Number);
  const [ay, am, ad] = asOf.split("-").map(Number);
  let years = ay - by;
  if (am < bm || (am === bm && ad < bd)) years -= 1;
  return years;
}

function trainCount(week) {
  return Object.values(week).filter((s) => s !== "rest").length;
}

function pal(n) {
  if (n <= 2) return 1.375;
  if (n <= 5) return 1.55;
  return 1.725;
}

function check(label, got, expected) {
  const close =
    typeof got === "number" &&
    typeof expected === "number" &&
    Math.abs(got - expected) <= Number.EPSILON * 8;
  if (got !== expected && !close) {
    console.error(`FAIL ${label}: got ${got} expected ${expected}`);
    process.exitCode = 1;
  } else {
    console.log(`OK ${label} = ${expected}`);
  }
}

for (const example of fixtures.examples) {
  const { input, expected, id } = example;
  const n = trainCount(input.trainingWeek);
  const age = ageYears(input.birthDate, input.goal.startOn);
  const sexAdj = input.sex === "male" ? 5 : -161;
  const bmr = 10 * input.weightKg + 6.25 * input.heightCm - 5 * age + sexAdj;
  const tdee = bmr * pal(n);
  const days = daysBetween(input.goal.startOn, input.goal.endOn);
  const lossKg = input.weightKg - input.goal.targetWeightKg;
  const weeks = days / 7;
  const implied = (100 * lossKg) / input.weightKg / weeks;
  const deficit = (lossKg * 7700) / days;
  const energy = roundHalfUp((tdee - deficit) / 10) * 10;
  const coeff = input.goal.type === "fat_loss" ? 1.8 : 2.2;
  const ffm = input.weightKg * (1 - input.bodyFatPct / 100);
  const proteinRaw = Math.min(
    Math.max(coeff * input.weightKg, 2.2 * ffm, (2.2 * input.skeletalMuscleMassKg) / 0.5),
    2.2 * input.weightKg,
  );
  const proteinG = roundHalfUp(proteinRaw);
  const fatG = roundHalfUp(0.8 * input.weightKg);
  const carbG = roundHalfUp((energy - proteinG * 4 - fatG * 9) / 4);

  check(`${id} energyKcal`, energy, expected.energyKcal);
  check(`${id} proteinG`, proteinG, expected.proteinG);
  check(`${id} fatG`, fatG, expected.fatG);
  check(`${id} carbG`, carbG, expected.carbG);
  check(`${id} bmrKcal`, roundHalfUp(bmr, 2), expected.bmrKcal);
  check(`${id} tdeeKcal`, tdee, expected.tdeeKcal);
  check(`${id} impliedWeeklyLossPct`, implied, expected.impliedWeeklyLossPct);
}

const female = fixtures.examples.find((e) => e.id === "female-retain-muscle-6d");
const unsafeDays = daysBetween(female.input.goal.startOn, fixtures.unsafeBlock.endOn);
const unsafeLoss = female.input.weightKg - female.input.goal.targetWeightKg;
const unsafeImplied =
  (100 * unsafeLoss) / female.input.weightKg / (unsafeDays / 7);
const daysMin = Math.ceil((700 * unsafeLoss) / female.input.weightKg);
const fastest = addDays(female.input.goal.startOn, daysMin);
check("unsafe impliedWeeklyLossPct", unsafeImplied, fixtures.unsafeBlock.expected.block.impliedWeeklyLossPct);
check("unsafe daysMin", daysMin, fixtures.unsafeBlock.expected.block.daysMin);
check("unsafe fastestSafeEndOn", fastest, "2026-10-16");

if (process.exitCode) {
  console.error("Independent fixture recompute disagreed with locked JSON.");
  process.exit(1);
}
console.log("Independent fixture recompute matches locked JSON literals.");
