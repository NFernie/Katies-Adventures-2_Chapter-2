import type { GeneratorBlock } from "./types";

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

export type RemainingTimeline =
  | {
      ok: true;
      impliedWeeklyLossPct: number;
      projectedEndWeightKg: number;
      weeksLeft: number;
      capPct: number;
    }
  | { ok: false; block: GeneratorBlock };

/** Remaining pace from the latest weight to the goal date. Same 1% cap as generate. */
export function previewRemainingTimeline(input: {
  currentWeightKg: number;
  targetWeightKg: number | null;
  asOf: string;
  endOn: string;
  weeklyLossCapPct: number;
}): RemainingTimeline {
  const { currentWeightKg, targetWeightKg, asOf, endOn, weeklyLossCapPct } = input;
  if (!(weeklyLossCapPct > 0 && weeklyLossCapPct <= 1)) {
    throw new Error("weeklyLossCapPct must be > 0 and <= 1.0");
  }
  const days = wholeDaysBetween(asOf, endOn);
  if (days <= 0 || targetWeightKg == null || targetWeightKg >= currentWeightKg) {
    return {
      ok: true,
      impliedWeeklyLossPct: 0,
      projectedEndWeightKg: currentWeightKg,
      weeksLeft: Math.max(days / 7, 0),
      capPct: weeklyLossCapPct,
    };
  }

  const lossKg = currentWeightKg - targetWeightKg;
  const weeks = days / 7;
  const impliedWeeklyLossPct = (100 * lossKg) / currentWeightKg / weeks;
  const capPct = weeklyLossCapPct;
  if (impliedWeeklyLossPct > capPct) {
    const daysMin = Math.ceil((700 * lossKg) / (currentWeightKg * capPct));
    return {
      ok: false,
      block: {
        code: "unsafe_loss_speed",
        impliedWeeklyLossPct,
        capPct,
        fastestSafeEndOn: addUtcDays(asOf, daysMin),
      },
    };
  }

  return {
    ok: true,
    impliedWeeklyLossPct,
    projectedEndWeightKg: targetWeightKg,
    weeksLeft: weeks,
    capPct,
  };
}
