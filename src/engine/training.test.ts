import assert from "node:assert/strict";
import test from "node:test";

import type { CatalogExercise } from "./training.ts";
import {
  assignSession,
  deloadSets,
  exerciseEligible,
  mapWeekSessions,
  swapLiftCandidates,
} from "./training.ts";
import type { DaySetting, Weekday } from "./types.ts";

const restWeek = {
  mon: "rest",
  tue: "rest",
  wed: "rest",
  thu: "rest",
  fri: "rest",
  sat: "rest",
  sun: "rest",
} as const satisfies Record<Weekday, DaySetting>;

/** Spec §7 mixed week: Mon gym / Wed bands / Fri gym / Sat home. */
const specWeek = {
  ...restWeek,
  mon: "gym",
  wed: "bands",
  fri: "gym",
  sat: "home",
} as const satisfies Record<Weekday, DaySetting>;

const gymSquat: CatalogExercise = {
  slug: "barbell-back-squat",
  title: "Barbell back squat",
  pattern: "squat",
  tracks: ["gym"],
  equipment: ["barbell", "rack"],
  laterality: "bilateral",
  defaultSets: 3,
  defaultReps: "5-8",
  cue: "Sit between the hips. Keep the chest tall.",
};

const bandSquat: CatalogExercise = {
  slug: "band-squat",
  title: "Band squat",
  pattern: "squat",
  tracks: ["bands"],
  equipment: ["band"],
  laterality: "bilateral",
  defaultSets: 3,
  defaultReps: "8-12",
  cue: "Stand on the band. Drive up against the pull.",
};

const homeSquat: CatalogExercise = {
  slug: "goblet-squat",
  title: "Goblet squat",
  pattern: "squat",
  tracks: ["home"],
  equipment: ["dumbbell"],
  laterality: "bilateral",
  defaultSets: 3,
  defaultReps: "8-12",
  cue: "Hold the weight at the chest. Elbows inside the knees.",
};

const gymHinge: CatalogExercise = {
  slug: "romanian-deadlift",
  title: "Romanian deadlift",
  pattern: "hinge",
  tracks: ["gym"],
  equipment: ["barbell"],
  laterality: "bilateral",
  defaultSets: 3,
  defaultReps: "5-8",
  cue: "Push the hips back. Soft knees.",
};

const gymPush: CatalogExercise = {
  slug: "barbell-bench-press",
  title: "Barbell bench press",
  pattern: "horizontal_push",
  tracks: ["gym"],
  equipment: ["barbell", "bench"],
  laterality: "bilateral",
  defaultSets: 3,
  defaultReps: "5-8",
  cue: "Bar path to the lower chest. Wrists stacked.",
};

const gymPull: CatalogExercise = {
  slug: "barbell-row",
  title: "Barbell row",
  pattern: "horizontal_pull",
  tracks: ["gym"],
  equipment: ["barbell"],
  laterality: "bilateral",
  defaultSets: 3,
  defaultReps: "6-10",
  cue: "Pull to the hip. Pause at the top.",
};

const bandHinge: CatalogExercise = {
  slug: "band-rdl",
  title: "Band RDL",
  pattern: "hinge",
  tracks: ["bands"],
  equipment: ["band"],
  laterality: "bilateral",
  defaultSets: 3,
  defaultReps: "8-12",
  cue: "Stretch the band as the hips travel back.",
};

const walk: CatalogExercise = {
  slug: "zone2-walk",
  title: "Zone 2 walk",
  pattern: "zone2",
  tracks: ["gym", "home", "bands", "bodyweight"],
  equipment: ["none"],
  laterality: "bilateral",
  defaultSets: 1,
  defaultReps: "20 min",
  cue: "Easy pace. You can talk in full sentences.",
};

const gymSquatAlt: CatalogExercise = {
  slug: "front-squat",
  title: "Front squat",
  pattern: "squat",
  tracks: ["gym"],
  equipment: ["barbell", "rack"],
  laterality: "bilateral",
  defaultSets: 3,
  defaultReps: "5-8",
  cue: "Elbows high. Sit down, not back.",
};

const catalog: CatalogExercise[] = [
  gymSquat,
  bandSquat,
  homeSquat,
  gymHinge,
  gymPush,
  gymPull,
  bandHinge,
  walk,
  gymSquatAlt,
];

test("upper_lower maps onto train days Monday-first, skipping rest", () => {
  const week = mapWeekSessions({
    trainingWeek: specWeek,
    splitId: "upper_lower",
    cardio: { kind: "zone2", sessionsPerWeek: 2 },
  });
  assert.equal(week.mon.focus, "upper");
  assert.equal(week.mon.setting, "gym");
  assert.equal(week.wed.focus, "lower");
  assert.equal(week.wed.setting, "bands");
  assert.equal(week.fri.focus, "upper");
  assert.equal(week.fri.setting, "gym");
  assert.equal(week.sat.focus, "lower");
  assert.equal(week.sat.setting, "home");
  assert.equal(week.tue.focus, "rest");
  assert.equal(week.thu.focus, "rest");
  assert.equal(week.sun.focus, "rest");
});

test("cardio lands on rest days first, generator-chosen, not an onboarding pick", () => {
  const week = mapWeekSessions({
    trainingWeek: specWeek,
    splitId: "upper_lower",
    cardio: { kind: "zone2", sessionsPerWeek: 2 },
  });
  assert.equal(week.tue.withCardio, true);
  assert.equal(week.thu.withCardio, true);
  assert.equal(week.mon.withCardio, false);
  assert.equal(week.sun.withCardio, false);
});

test("gym Tuesday and bands Thursday yield different squat pools", () => {
  const tueGym = {
    ...restWeek,
    tue: "gym" as const,
    thu: "bands" as const,
  };
  const tuesday = assignSession({
    weekday: "tue",
    trainingWeek: tueGym,
    splitId: "full_body",
    cardio: { kind: "none", sessionsPerWeek: 0 },
    catalog,
    deload: false,
  });
  const thursday = assignSession({
    weekday: "thu",
    trainingWeek: tueGym,
    splitId: "full_body",
    cardio: { kind: "none", sessionsPerWeek: 0 },
    catalog,
    deload: false,
  });
  const tueSlugs = tuesday.items.map((row) => row.slug);
  const thuSlugs = thursday.items.map((row) => row.slug);
  assert.ok(tueSlugs.includes("barbell-back-squat"));
  assert.ok(!tueSlugs.includes("band-squat"));
  assert.ok(thuSlugs.includes("band-squat"));
  assert.ok(!thuSlugs.includes("barbell-back-squat"));
  assert.equal(tuesday.setting, "gym");
  assert.equal(thursday.setting, "bands");
});

test("swap lift stays in-setting and the same movement pattern", () => {
  const found = swapLiftCandidates({
    currentSlug: "barbell-back-squat",
    pattern: "squat",
    setting: "gym",
    catalog,
  });
  assert.ok(found.length > 0);
  assert.ok(found.every((row) => row.pattern === "squat"));
  assert.ok(found.every((row) => row.tracks.includes("gym")));
  assert.ok(found.every((row) => row.slug !== "barbell-back-squat"));
  assert.ok(!found.some((row) => row.slug === "band-squat"));
});

test("exerciseEligible rejects a gym lift on a bands day", () => {
  assert.equal(exerciseEligible(gymSquat, "bands"), false);
  assert.equal(exerciseEligible(bandSquat, "bands"), true);
  assert.equal(exerciseEligible(walk, "home"), true);
});

test("male and female use the same movement rules", () => {
  const input = {
    weekday: "mon" as const,
    trainingWeek: specWeek,
    splitId: "upper_lower" as const,
    cardio: { kind: "zone2" as const, sessionsPerWeek: 2 },
    catalog,
    deload: false,
  };
  const male = assignSession(input);
  const female = assignSession(input);
  assert.deepEqual(male.items.map((row) => row.slug), female.items.map((row) => row.slug));
  assert.deepEqual(
    male.items.map((row) => row.plannedSets),
    female.items.map((row) => row.plannedSets),
  );
});

test("deload multiplies planned sets by 0.6", () => {
  assert.equal(deloadSets(3), 2);
  const normal = assignSession({
    weekday: "wed",
    trainingWeek: specWeek,
    splitId: "upper_lower",
    cardio: { kind: "none", sessionsPerWeek: 0 },
    catalog,
    deload: false,
  });
  const deload = assignSession({
    weekday: "wed",
    trainingWeek: specWeek,
    splitId: "upper_lower",
    cardio: { kind: "none", sessionsPerWeek: 0 },
    catalog,
    deload: true,
  });
  assert.ok(normal.items.length > 0);
  assert.equal(deload.items[0]?.plannedSets, deloadSets(normal.items[0]?.catalogSets ?? 3));
});

test("rest day without cardio has no lift catalog", () => {
  const sunday = assignSession({
    weekday: "sun",
    trainingWeek: specWeek,
    splitId: "upper_lower",
    cardio: { kind: "zone2", sessionsPerWeek: 2 },
    catalog,
    deload: false,
  });
  assert.equal(sunday.focus, "rest");
  assert.deepEqual(sunday.items, []);
});

test("git catalog covers gym, home, bands, and bodyweight", async () => {
  const { CATALOG_EXERCISES } = await import("../catalog/exercises.ts");
  const tracks = new Set(CATALOG_EXERCISES.flatMap((row) => row.tracks));
  for (const track of ["gym", "home", "bands", "bodyweight"] as const) {
    assert.ok(tracks.has(track), `missing track ${track}`);
  }
  assert.ok(CATALOG_EXERCISES.every((row) => row.cue.length > 0));
  const gymTue = {
    ...restWeek,
    tue: "gym" as const,
    thu: "bands" as const,
  };
  const tuesday = assignSession({
    weekday: "tue",
    trainingWeek: gymTue,
    splitId: "full_body",
    cardio: { kind: "none", sessionsPerWeek: 0 },
    catalog: CATALOG_EXERCISES,
    deload: false,
  });
  const thursday = assignSession({
    weekday: "thu",
    trainingWeek: gymTue,
    splitId: "full_body",
    cardio: { kind: "none", sessionsPerWeek: 0 },
    catalog: CATALOG_EXERCISES,
    deload: false,
  });
  assert.ok(tuesday.items.some((row) => row.slug === "barbell-back-squat"));
  assert.ok(thursday.items.some((row) => row.slug === "band-squat"));
  assert.ok(!tuesday.items.some((row) => row.slug === "band-squat"));
  assert.ok(!thursday.items.some((row) => row.slug === "barbell-back-squat"));
});
