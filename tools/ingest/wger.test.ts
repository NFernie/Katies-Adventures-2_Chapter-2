import assert from "node:assert/strict";
import test from "node:test";

import {
  formatExercisesJson,
  mapWgerExercise,
  mergeExercises,
  patternFromWger,
  type CatalogExerciseRow,
  type WgerExerciseInfo,
} from "./wger.ts";

const pullUp: WgerExerciseInfo = {
  id: 227,
  category: { name: "Back" },
  equipment: [{ name: "Pull-up bar" }],
  license: { short_name: "CC-BY-SA 4" },
  translations: [
    {
      language: 2,
      name: "Pull-ups",
      description: "<p>Hang long. Pull the chest to the bar.</p>",
    },
  ],
};

test("mapWgerExercise maps a pull-up onto vertical_pull and does not copy images", () => {
  const mapped = mapWgerExercise(pullUp);
  assert.ok(mapped);
  assert.equal(mapped.slug, "pull-ups");
  assert.equal(mapped.pattern, "vertical_pull");
  assert.ok(mapped.tracks.includes("gym"));
  assert.ok(mapped.tracks.includes("bodyweight"));
  assert.equal(mapped.source, "wger");
  assert.ok(!("images" in mapped));
  assert.match(mapped.cue, /Hang long/i);
});

test("mapWgerExercise refuses a food-shaped payload", () => {
  assert.throws(
    () =>
      mapWgerExercise({
        ...pullUp,
        ingredients: [{ name: "chicken breast" }],
      }),
    /exercises only/i,
  );
});

test("patternFromWger skips abs and isolation work with no BodyPlan pattern", () => {
  assert.equal(patternFromWger("Crunches", "Abs"), null);
  assert.equal(patternFromWger("Hip thrust", "Legs"), "hinge");
});

test("mergeExercises skips an existing catalog slug", () => {
  const existing: CatalogExerciseRow[] = [
    {
      slug: "pull-ups",
      title: "Pull-ups",
      pattern: "vertical_pull",
      tracks: ["gym"],
      equipment: ["bar"],
      laterality: "bilateral",
      defaultSets: 3,
      defaultReps: "6-10",
      cue: "Already in the catalog.",
    },
  ];
  const result = mergeExercises(existing, [pullUp]);
  assert.deepEqual(result.added, []);
  assert.deepEqual(result.skipped, ["pull-ups"]);
  assert.equal(result.exercises.length, 1);
});

test("formatExercisesJson keeps compact tracks arrays", () => {
  const text = formatExercisesJson([
    {
      slug: "pull-ups",
      title: "Pull-ups",
      pattern: "vertical_pull",
      tracks: ["gym", "bodyweight"],
      equipment: ["bar"],
      laterality: "bilateral",
      defaultSets: 3,
      defaultReps: "8-12",
      cue: "Hang long. Pull the chest to the bar.",
      source: "wger",
    },
  ]);
  assert.match(text, /"tracks": \["gym", "bodyweight"\]/);
  assert.match(text, /"source": "wger"/);
});
