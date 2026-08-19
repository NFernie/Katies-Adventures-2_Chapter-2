import assert from "node:assert/strict";
import test from "node:test";

import { SignedOutError } from "./errors.ts";
import { DEFAULT_OWNER_ID } from "./owner.ts";
import {
  assertEveryCallScopedTo,
  createRecordingClient,
} from "./recording-client.ts";
import {
  completeWorkoutItem,
  listWorkoutItems,
  listWorkoutSessionForDay,
  saveWorkoutSets,
  skipWorkoutItem,
  swapWorkoutItem,
} from "./workouts.ts";

const SESSION_ID = "11111111-2222-4333-8444-555555555555";
const DAY_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const WORKOUT_ID = "dddddddd-eeee-4fff-8aaa-bbbbbbbbbbbb";
const ITEM_ID = "cccccccc-dddd-4eee-8fff-aaaaaaaaaaaa";

test("listWorkoutSessionForDay throws and issues no query when signed out", async () => {
  const client = createRecordingClient({ userId: null });
  await assert.rejects(() => listWorkoutSessionForDay(DAY_ID, client), SignedOutError);
  assert.equal(client.calls.length, 0);
});

test("listWorkoutSessionForDay filters by session owner_id and day plan", async () => {
  const client = createRecordingClient({ userId: SESSION_ID, data: null });
  await listWorkoutSessionForDay(DAY_ID, client);
  assert.equal(client.calls[0]?.table, "workout_sessions");
  assert.equal(client.calls[0]?.op, "select");
  assert.ok(
    client.calls[0]?.filters.some(
      (filter) => filter.column === "owner_id" && filter.value === SESSION_ID,
    ),
  );
  assert.ok(
    client.calls[0]?.filters.some(
      (filter) => filter.column === "day_plan_id" && filter.value === DAY_ID,
    ),
  );
  assertEveryCallScopedTo(client.calls, SESSION_ID);
});

test("listWorkoutItems is scoped to the session owner", async () => {
  const client = createRecordingClient({ userId: SESSION_ID, data: [] });
  await listWorkoutItems(WORKOUT_ID, client);
  assert.equal(client.calls[0]?.table, "workout_items");
  assert.ok(
    client.calls[0]?.filters.some(
      (filter) => filter.column === "owner_id" && filter.value === SESSION_ID,
    ),
  );
  assert.ok(
    client.calls[0]?.filters.some(
      (filter) => filter.column === "workout_session_id" && filter.value === WORKOUT_ID,
    ),
  );
  assertEveryCallScopedTo(client.calls, SESSION_ID);
});

test("swapWorkoutItem stamps session owner_id and never DEFAULT_OWNER_ID", async () => {
  const client = createRecordingClient({ userId: SESSION_ID, data: null });
  await swapWorkoutItem(ITEM_ID, "front-squat", client);
  const update = client.calls.find((call) => call.op === "update");
  assert.ok(update);
  assert.equal(update.table, "workout_items");
  assert.ok(
    update.filters.some(
      (filter) => filter.column === "owner_id" && filter.value === SESSION_ID,
    ),
  );
  const row = update.rows[0] as { exercise_slug: string; owner_id?: string };
  assert.equal(row.exercise_slug, "front-squat");
  assert.notEqual(row.owner_id, DEFAULT_OWNER_ID);
  assertEveryCallScopedTo(client.calls, SESSION_ID);
});

test("complete and skip persist on the session owner", async () => {
  const client = createRecordingClient({ userId: SESSION_ID, data: null });
  await completeWorkoutItem(ITEM_ID, client);
  await skipWorkoutItem(ITEM_ID, client);
  await saveWorkoutSets(ITEM_ID, [{ n: 1, kg: 80, reps: 5, done: true }], client);
  assertEveryCallScopedTo(client.calls, SESSION_ID);
  const skip = client.calls.find((call) => {
    const row = call.rows[0] as { sets?: { skipped?: boolean } } | undefined;
    return call.op === "update" && row?.sets?.skipped === true;
  });
  assert.ok(skip);
  const skipRow = skip.rows[0] as { completed: boolean };
  assert.equal(skipRow.completed, true);
});
