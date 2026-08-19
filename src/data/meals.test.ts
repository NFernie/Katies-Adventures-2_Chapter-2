import assert from "node:assert/strict";
import test from "node:test";

import { SignedOutError } from "./errors.ts";
import { DEFAULT_OWNER_ID } from "./owner.ts";
import {
  assertEveryCallScopedTo,
  createRecordingClient,
} from "./recording-client.ts";
import { listMealSlotsForDay, pinMealSlot, swapMealSlot, setMealEaten } from "./meals.ts";

const SESSION_ID = "11111111-2222-4333-8444-555555555555";
const SLOT_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

test("listMealSlotsForDay throws and issues no query when signed out", async () => {
  const client = createRecordingClient({ userId: null });
  await assert.rejects(() => listMealSlotsForDay(SLOT_ID, client), SignedOutError);
  assert.equal(client.calls.length, 0);
});

test("listMealSlotsForDay filters by session owner_id and day plan", async () => {
  const client = createRecordingClient({ userId: SESSION_ID, data: [] });
  await listMealSlotsForDay(SLOT_ID, client);
  assert.equal(client.calls.length, 1);
  assert.equal(client.calls[0]?.table, "meal_slots");
  assert.equal(client.calls[0]?.op, "select");
  assert.ok(
    client.calls[0]?.filters.some(
      (filter) => filter.column === "owner_id" && filter.value === SESSION_ID,
    ),
  );
  assert.ok(
    client.calls[0]?.filters.some(
      (filter) => filter.column === "day_plan_id" && filter.value === SLOT_ID,
    ),
  );
  assertEveryCallScopedTo(client.calls, SESSION_ID);
});

test("swapMealSlot throws and issues no query when signed out", async () => {
  const client = createRecordingClient({ userId: null });
  await assert.rejects(
    () => swapMealSlot(SLOT_ID, "tofu-stir-fry", client),
    SignedOutError,
  );
  assert.equal(client.calls.length, 0);
});

test("swapMealSlot stamps session owner_id and never DEFAULT_OWNER_ID", async () => {
  const client = createRecordingClient({ userId: SESSION_ID, data: null });
  await swapMealSlot(SLOT_ID, "tofu-stir-fry", client);
  const update = client.calls.find((call) => call.op === "update");
  assert.ok(update);
  assert.equal(update.table, "meal_slots");
  assert.ok(update.filters.some((filter) => filter.column === "owner_id" && filter.value === SESSION_ID));
  assert.ok(update.filters.some((filter) => filter.column === "id" && filter.value === SLOT_ID));
  const row = update.rows[0] as { recipe_slug: string; owner_id?: string };
  assert.equal(row.recipe_slug, "tofu-stir-fry");
  assert.notEqual(row.owner_id, DEFAULT_OWNER_ID);
  assertEveryCallScopedTo(client.calls, SESSION_ID);
});

test("pinMealSlot and setMealEaten are scoped to the session", async () => {
  const client = createRecordingClient({ userId: SESSION_ID, data: null });
  await pinMealSlot(SLOT_ID, true, client);
  await setMealEaten(SLOT_ID, true, client);
  assertEveryCallScopedTo(client.calls, SESSION_ID);
  const pin = client.calls.find((call) => {
    const row = call.rows[0] as { pinned?: boolean } | undefined;
    return call.op === "update" && row?.pinned === true;
  });
  assert.ok(pin);
});
