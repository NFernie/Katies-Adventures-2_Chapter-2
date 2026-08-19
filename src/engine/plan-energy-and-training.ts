import type {
  CardioKind,
  DaySetting,
  EngineBody,
  EngineGoal,
  EnginePrefs,
  EngineResult,
  EngineSuccess,
  GoalType,
  SplitId,
  Weekday,
} from "./types";

export const WEEKDAYS: Weekday[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

const MS_PER_DAY = 86_400_000;

function parseUtcDate(iso: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new Error(`Invalid date ${iso}`);
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(iso: string, days: number): string {
  const date = parseUtcDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtcDate(date);
}

function wholeDaysBetween(startOn: string, endOn: string): number {
  const start = parseUtcDate(startOn).getTime();
  const end = parseUtcDate(endOn).getTime();
  return Math.round((end - start) / MS_PER_DAY);
}

function ageYearsOn(birthDate: string, asOf: string): number {
  const birth = parseUtcDate(birthDate);
  const on = parseUtcDate(asOf);
  let years = on.getUTCFullYear() - birth.getUTCFullYear();
  const monthDayBefore =
    on.getUTCMonth() < birth.getUTCMonth() ||
    (on.getUTCMonth() === birth.getUTCMonth() &&
      on.getUTCDate() < birth.getUTCDate());
  if (monthDayBefore) years -= 1;
  return years;
}

/** Half-up, away from 0 for the positive values in the fixtures. */
export function roundHalfUp(value: number, digits = 0): number {
  const factor = 10 ** digits;
  const scaled = value * factor;
  const rounded = scaled >= 0 ? Math.floor(scaled + 0.5) : Math.ceil(scaled - 0.5);
  return rounded / factor;
}

function countTrainDays(week: EnginePrefs["trainingWeek"]): number {
  return WEEKDAYS.filter((day) => week[day] !== "rest").length;
}

function palFor(trainDays: number): number {
  if (trainDays <= 2) return 1.375;
  if (trainDays <= 5) return 1.55;
  return 1.725;
}

function splitFor(trainDays: number): SplitId {
  if (trainDays <= 3) return "full_body";
  if (trainDays === 4) return "upper_lower";
  if (trainDays === 5) return "upper_lower_plus";
  if (trainDays === 6) return "ppl_twice";
  return "ppl_twice_plus";
}

function cardioFor(
  type: GoalType,
  trainDays: number,
): EngineSuccess["cardio"] {
  if (type === "fat_loss") {
    return { kind: "zone2", sessionsPerWeek: trainDays >= 4 ? 2 : 1 };
  }
  if (type === "fat_loss_retain_muscle") {
    return { kind: "zone2", sessionsPerWeek: 1 };
  }
  if (type === "recomp") {
    return { kind: "intervals", sessionsPerWeek: 1 };
  }
  const kind: CardioKind = trainDays >= 4 ? "none" : "zone2";
  return { kind, sessionsPerWeek: kind === "none" ? 0 : 1 };
}

function proteinCoeff(type: GoalType): number {
  if (type === "fat_loss") return 1.8;
  if (type === "fat_loss_retain_muscle") return 2.2;
  if (type === "recomp") return 2.0;
  return 1.6;
}

function fatCoeff(type: GoalType): number {
  if (type === "fat_loss" || type === "fat_loss_retain_muscle") return 0.8;
  return 1.0;
}

function deloadWeeks(days: number): number[] {
  const weekCount = days / 7;
  const weeks: number[] = [];
  for (let week = 4; week <= weekCount; week += 4) {
    weeks.push(week);
  }
  return weeks;
}

function bmrKcalUnrounded(body: EngineBody, ageYears: number): number {
  const base = 10 * body.weightKg + 6.25 * body.heightCm - 5 * ageYears;
  return body.sex === "male" ? base + 5 : base - 161;
}

function macrosFor(
  body: EngineBody,
  type: GoalType,
  energyKcal: number,
): { proteinG: number; fatG: number; carbG: number; macroChecksumKcal: number } {
  const ffmKg = body.weightKg * (1 - body.bodyFatPct / 100);
  let proteinRaw = Math.max(
    proteinCoeff(type) * body.weightKg,
    2.2 * ffmKg,
    (2.2 * body.skeletalMuscleMassKg) / 0.5,
  );
  proteinRaw = Math.min(proteinRaw, 2.2 * body.weightKg);
  const proteinG = roundHalfUp(proteinRaw);

  const fatFloor = roundHalfUp(0.7 * body.weightKg);
  let fatG = roundHalfUp(Math.max(fatCoeff(type) * body.weightKg, 0.7 * body.weightKg));

  let remainKcal = energyKcal - proteinG * 4 - fatG * 9;
  if (remainKcal < 0) {
    while (remainKcal < 0 && fatG > fatFloor) {
      fatG -= 1;
      remainKcal = energyKcal - proteinG * 4 - fatG * 9;
    }
  }

  let carbG = remainKcal < 0 ? 0 : roundHalfUp(remainKcal / 4);
  let checksum = proteinG * 4 + carbG * 4 + fatG * 9;
  if (Math.abs(checksum - energyKcal) > 10) {
    carbG += checksum > energyKcal ? -1 : 1;
    if (carbG < 0) carbG = 0;
    checksum = proteinG * 4 + carbG * 4 + fatG * 9;
  }

  return { proteinG, fatG, carbG, macroChecksumKcal: checksum };
}

export function planEnergyAndTraining(input: {
  body: EngineBody;
  goal: EngineGoal;
  prefs: EnginePrefs;
}): EngineResult {
  const { body, goal, prefs } = input;
  const trainDaySettings: DaySetting[] = WEEKDAYS.map((day) => prefs.trainingWeek[day]);
  const trainingDaysPerWeek = countTrainDays(prefs.trainingWeek);
  if (trainingDaysPerWeek < 1 || trainingDaysPerWeek > 7) {
    throw new Error("At least one train day is required");
  }

  const days = wholeDaysBetween(goal.startOn, goal.endOn);
  if (days <= 0) {
    throw new Error("endOn must be strictly after startOn");
  }

  const ageYears = ageYearsOn(body.birthDate, goal.startOn);
  const bmrRaw = bmrKcalUnrounded(body, ageYears);
  const pal = palFor(trainingDaysPerWeek);
  const tdeeKcal = bmrRaw * pal;

  const losing =
    goal.type !== "maintain" &&
    goal.targetWeightKg != null &&
    goal.targetWeightKg < body.weightKg;

  let impliedWeeklyLossPct = 0;
  let dailyDeficitKcal = 0;
  let lossKg = 0;

  if (losing && goal.targetWeightKg != null) {
    lossKg = body.weightKg - goal.targetWeightKg;
    const weeks = days / 7;
    impliedWeeklyLossPct = (100 * lossKg) / body.weightKg / weeks;
    const capPct = goal.weeklyLossCapPct;
    if (impliedWeeklyLossPct > capPct) {
      const daysMin = Math.ceil((700 * lossKg) / (body.weightKg * capPct));
      return {
        ok: false,
        block: {
          code: "unsafe_loss_speed",
          impliedWeeklyLossPct,
          capPct,
          fastestSafeEndOn: addUtcDays(goal.startOn, daysMin),
        },
      };
    }
    dailyDeficitKcal = (lossKg * 7700) / days;
  }

  const energyUnrounded = tdeeKcal - dailyDeficitKcal;
  const energyKcal = roundHalfUp(energyUnrounded / 10) * 10;
  const macros = macrosFor(body, goal.type, energyKcal);
  const warnings: EngineSuccess["warnings"] = [];
  const floor = body.sex === "male" ? 1500 : 1200;
  if (energyKcal < floor) warnings.push("below_calorie_floor");

  return {
    ok: true,
    ageYears,
    bmrKcal: roundHalfUp(bmrRaw, 2),
    pal,
    tdeeKcal,
    impliedWeeklyLossPct,
    dailyDeficitKcal,
    energyKcal,
    ...macros,
    warnings,
    splitId: splitFor(trainingDaysPerWeek),
    trainingDaysPerWeek: trainingDaysPerWeek as EngineSuccess["trainingDaysPerWeek"],
    trainDaySettings,
    cardio: cardioFor(goal.type, trainingDaysPerWeek),
    deloadWeeks: deloadWeeks(days),
  };
}
