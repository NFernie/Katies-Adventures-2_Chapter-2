import { WEEKDAYS } from "./plan-energy-and-training";
import type {
  CardioKind,
  DaySetting,
  SplitId,
  TrainingSetting,
  Weekday,
} from "./types";

export type MovementPattern =
  | "squat"
  | "hinge"
  | "lunge"
  | "horizontal_push"
  | "vertical_push"
  | "horizontal_pull"
  | "vertical_pull"
  | "zone2"
  | "intervals";

export type SessionFocus =
  | "full_body"
  | "upper"
  | "lower"
  | "push"
  | "pull"
  | "legs"
  | "cardio"
  | "rest";

export type CatalogExercise = {
  slug: string;
  title: string;
  pattern: MovementPattern;
  tracks: TrainingSetting[];
  equipment: string[];
  laterality: "bilateral" | "unilateral";
  defaultSets: number;
  defaultReps: string;
  cue: string;
};

export type WeekSessionSlot = {
  setting: DaySetting;
  focus: SessionFocus;
  withCardio: boolean;
};

export type AssignedSessionItem = {
  slug: string;
  title: string;
  pattern: MovementPattern;
  plannedSets: number;
  plannedReps: string;
  catalogSets: number;
  cue: string;
};

export type AssignedSession = {
  weekday: Weekday;
  setting: DaySetting;
  focus: SessionFocus;
  withCardio: boolean;
  items: AssignedSessionItem[];
};

export type CardioPrescription = {
  kind: CardioKind;
  sessionsPerWeek: number;
};

const LIFT_SLOTS: Record<SplitId, SessionFocus[]> = {
  full_body: ["full_body", "full_body", "full_body"],
  upper_lower: ["upper", "lower", "upper", "lower"],
  upper_lower_plus: ["upper", "lower", "upper", "lower", "full_body"],
  ppl_twice: ["push", "pull", "legs", "push", "pull", "legs"],
  ppl_twice_plus: ["push", "pull", "legs", "push", "pull", "legs", "cardio"],
};

const PATTERNS: Record<Exclude<SessionFocus, "rest" | "cardio">, MovementPattern[]> = {
  full_body: ["squat", "hinge", "horizontal_push", "horizontal_pull"],
  upper: ["horizontal_push", "horizontal_pull", "vertical_push", "vertical_pull"],
  lower: ["squat", "hinge", "lunge"],
  push: ["horizontal_push", "vertical_push"],
  pull: ["horizontal_pull", "vertical_pull"],
  legs: ["squat", "hinge", "lunge"],
};

function isCardioPattern(pattern: MovementPattern): boolean {
  return pattern === "zone2" || pattern === "intervals";
}

export function deloadSets(catalogSets: number): number {
  return Math.max(1, Math.round(catalogSets * 0.6));
}

export function exerciseEligible(
  exercise: CatalogExercise,
  setting: DaySetting,
): boolean {
  if (setting === "rest") return isCardioPattern(exercise.pattern);
  return exercise.tracks.includes(setting);
}

export function swapLiftCandidates(input: {
  currentSlug: string;
  pattern: MovementPattern;
  setting: TrainingSetting;
  catalog: CatalogExercise[];
}): CatalogExercise[] {
  const inSetting = input.catalog.filter(
    (row) =>
      row.tracks.includes(input.setting) &&
      row.slug !== input.currentSlug &&
      !isCardioPattern(row.pattern),
  );
  const samePattern = inSetting.filter((row) => row.pattern === input.pattern);
  if (samePattern.length > 0) return samePattern.slice(0, 3);
  return inSetting.slice(0, 3);
}

export function mapWeekSessions(input: {
  trainingWeek: Record<Weekday, DaySetting>;
  splitId: SplitId;
  cardio: CardioPrescription;
}): Record<Weekday, WeekSessionSlot> {
  const slots = LIFT_SLOTS[input.splitId];
  const mapped = {} as Record<Weekday, WeekSessionSlot>;
  let slotIndex = 0;

  for (const weekday of WEEKDAYS) {
    const setting = input.trainingWeek[weekday];
    if (setting === "rest") {
      mapped[weekday] = { setting, focus: "rest", withCardio: false };
      continue;
    }
    const focus = slots[slotIndex] ?? "cardio";
    slotIndex += 1;
    mapped[weekday] = { setting, focus, withCardio: false };
  }

  let remaining =
    input.cardio.kind === "none" ? 0 : Math.max(0, input.cardio.sessionsPerWeek);

  const cardioFocusDays = WEEKDAYS.filter((day) => mapped[day].focus === "cardio");
  const restDays = WEEKDAYS.filter((day) => mapped[day].focus === "rest");
  const liftDays = WEEKDAYS.filter(
    (day) => mapped[day].focus !== "rest" && mapped[day].focus !== "cardio",
  );

  for (const day of [...cardioFocusDays, ...restDays, ...liftDays]) {
    if (remaining <= 0) break;
    mapped[day] = { ...mapped[day], withCardio: true };
    remaining -= 1;
  }

  return mapped;
}

function toItem(exercise: CatalogExercise, deload: boolean): AssignedSessionItem {
  return {
    slug: exercise.slug,
    title: exercise.title,
    pattern: exercise.pattern,
    plannedSets: deload ? deloadSets(exercise.defaultSets) : exercise.defaultSets,
    plannedReps: exercise.defaultReps,
    catalogSets: exercise.defaultSets,
    cue: exercise.cue,
  };
}

function pick(
  catalog: CatalogExercise[],
  setting: DaySetting,
  pattern: MovementPattern,
  used: Set<string>,
): CatalogExercise | undefined {
  return catalog.find(
    (row) =>
      row.pattern === pattern &&
      exerciseEligible(row, setting) &&
      !used.has(row.slug),
  );
}

export function assignSession(input: {
  weekday: Weekday;
  trainingWeek: Record<Weekday, DaySetting>;
  splitId: SplitId;
  cardio: CardioPrescription;
  catalog: CatalogExercise[];
  deload: boolean;
}): AssignedSession {
  const week = mapWeekSessions({
    trainingWeek: input.trainingWeek,
    splitId: input.splitId,
    cardio: input.cardio,
  });
  const slot = week[input.weekday];
  const items: AssignedSessionItem[] = [];
  const used = new Set<string>();

  if (slot.focus !== "rest" && slot.focus !== "cardio") {
    for (const pattern of PATTERNS[slot.focus]) {
      const found = pick(input.catalog, slot.setting, pattern, used);
      if (!found) continue;
      used.add(found.slug);
      items.push(toItem(found, input.deload));
    }
  }

  if (slot.withCardio && input.cardio.kind !== "none") {
    const pattern: MovementPattern =
      input.cardio.kind === "intervals" ? "intervals" : "zone2";
    const found = pick(input.catalog, slot.setting, pattern, used);
    if (found) items.push(toItem(found, false));
  }

  return {
    weekday: input.weekday,
    setting: slot.setting,
    focus: slot.focus,
    withCardio: slot.withCardio,
    items,
  };
}
