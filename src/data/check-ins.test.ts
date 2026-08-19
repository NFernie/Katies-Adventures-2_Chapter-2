import assert from "node:assert/strict";
import test from "node:test";

import { SignedOutError } from "./errors.ts";
import { DEFAULT_OWNER_ID } from "./owner.ts";
import {
  assertEveryCallScopedTo,
  createRecordingClient,
} from "./recording-client.ts";
import { createMemoryClient } from "./memory-client.ts";
import { listCheckIns, upsertCheckIn, deleteCheckIn } from "./check-ins.ts";

const SESSION_ID = "11111111-2222-4333-8444-555555555555";

const write = {
  loggedOn: "2026-08-19",
  weightKg: 87.2,
  bodyFatPct: 21.5,
  skeletalMuscleMassKg: 36.4,
};

test("listCheckIns throws and issues no query when signed out", async () => {
  const client = createRecordingClient({ userId: null });
  await assert.rejects(() => listCheckIns(client), SignedOutError);
  assert.equal(client.calls.length, 0);
});

test("listCheckIns filters by session owner_id", async () => {
  const client = createRecordingClient({ userId: SESSION_ID, data: [] });
  await listCheckIns(client);
  assert.equal(client.calls[0]?.table, "check_ins");
  assert.equal(client.calls[0]?.op, "select");
  assert.ok(
    client.calls[0]?.filters.some(
      (filter) => filter.column === "owner_id" && filter.value === SESSION_ID,
    ),
  );
  assertEveryCallScopedTo(client.calls, SESSION_ID);
});

test("upsertCheckIn throws and issues no query when signed out", async () => {
  const client = createRecordingClient({ userId: null });
  await assert.rejects(() => upsertCheckIn(write, client), SignedOutError);
  assert.equal(client.calls.length, 0);
});

test("upsertCheckIn stamps session owner_id and has no photo field", async () => {
  const client = createRecordingClient({ userId: SESSION_ID, data: null });
  await upsertCheckIn(write, client);
  const upsert = client.calls.find((call) => call.op === "upsert");
  assert.ok(upsert);
  assert.equal(upsert.table, "check_ins");
  const row = upsert.rows[0] as Record<string, unknown>;
  assert.equal(row.owner_id, SESSION_ID);
  assert.notEqual(row.owner_id, DEFAULT_OWNER_ID);
  assert.equal(row.logged_on, "2026-08-19");
  assert.equal(row.weight_kg, 87.2);
  assert.equal(row.body_fat_pct, 21.5);
  assert.equal(row.skeletal_muscle_mass_kg, 36.4);
  assert.ok(!("photo" in row));
  assert.ok(!("image_url" in row));
  assert.ok(!Object.keys(row).some((key) => key.includes("photo")));
  assertEveryCallScopedTo(client.calls, SESSION_ID);
});

test("deleteCheckIn throws and issues no query when signed out", async () => {
  const client = createRecordingClient({ userId: null });
  await assert.rejects(
    () => deleteCheckIn("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", client),
    SignedOutError,
  );
  assert.equal(client.calls.length, 0);
});

test("deleteCheckIn filters by id and session owner_id", async () => {
  const client = createRecordingClient({ userId: SESSION_ID, data: null });
  const id = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  await deleteCheckIn(id, client);
  const call = client.calls[0];
  assert.ok(call);
  assert.equal(call.table, "check_ins");
  assert.equal(call.op, "delete");
  assert.ok(
    call.filters.some((filter) => filter.column === "id" && filter.value === id),
  );
  assert.ok(
    call.filters.some(
      (filter) => filter.column === "owner_id" && filter.value === SESSION_ID,
    ),
  );
  assertEveryCallScopedTo(client.calls, SESSION_ID);
});

test("deleteCheckIn removes the row for the signed-in owner", async () => {
  const client = createMemoryClient({ userId: SESSION_ID });
  await upsertCheckIn(write, client);
  const before = await listCheckIns(client);
  assert.equal(before.length, 1);
  assert.ok(before[0]?.id);
  await deleteCheckIn(before[0].id, client);
  const after = await listCheckIns(client);
  assert.equal(after.length, 0);
});
