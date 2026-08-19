import assert from "node:assert/strict";
import test from "node:test";

import { SignedOutError } from "./errors.ts";
import { DEFAULT_OWNER_ID } from "./owner.ts";
import {
  assertEveryCallScopedTo,
  createRecordingClient,
} from "./recording-client.ts";
import { listTrainingDays, replaceTrainingDays } from "./training-days.ts";

const SESSION_ID = "11111111-2222-4333-8444-555555555555";

const week = [
  { weekday: "mon" as const, setting: "gym" as const },
  { weekday: "thu" as const, setting: "bands" as const },
];

test("listTrainingDays throws and issues no query when signed out", async () => {
  const client = createRecordingClient({ userId: null });
  await assert.rejects(() => listTrainingDays(client), SignedOutError);
  assert.equal(client.calls.length, 0);
});

test("listTrainingDays always filters by the session owner_id", async () => {
  const client = createRecordingClient({ userId: SESSION_ID, data: [] });
  await listTrainingDays(client);
  assertEveryCallScopedTo(client.calls, SESSION_ID);
});

test("replaceTrainingDays stamps owner_id from the session on every row", async () => {
  const client = createRecordingClient({ userId: SESSION_ID, data: null });
  await replaceTrainingDays(week, client);
  const insert = client.calls.find((call) => call.op === "insert" || call.op === "upsert");
  assert.ok(insert);
  assert.equal(insert.table, "training_days");
  for (const row of insert.rows) {
    assert.equal((row as { owner_id: string }).owner_id, SESSION_ID);
    assert.notEqual((row as { owner_id: string }).owner_id, DEFAULT_OWNER_ID);
  }
  assertEveryCallScopedTo(client.calls, SESSION_ID);
});

test("replaceTrainingDays cannot write another owner's rows", async () => {
  const client = createRecordingClient({ userId: SESSION_ID, data: null });
  await replaceTrainingDays(
    week.map((day) => ({ ...day, ownerId: DEFAULT_OWNER_ID })),
    client,
  );
  const insert = client.calls.find((call) => call.op === "insert" || call.op === "upsert");
  assert.ok(insert);
  for (const row of insert.rows) {
    assert.equal((row as { owner_id: string }).owner_id, SESSION_ID);
  }
});
