import assert from "node:assert/strict";
import test from "node:test";

import { SignedOutError } from "./errors.ts";
import { DEFAULT_OWNER_ID } from "./owner.ts";
import { getProfile, upsertProfile } from "./profiles.ts";
import {
  assertEveryCallScopedTo,
  createRecordingClient,
} from "./recording-client.ts";

const SESSION_ID = "11111111-2222-4333-8444-555555555555";

const sampleWrite = {
  sex: "female" as const,
  birthDate: "1990-01-15",
  heightCm: 168,
  weightKg: 72,
  bodyFatPct: 28.5,
  skeletalMuscleMassKg: 26.9,
};

test("getProfile throws and issues no query when signed out", async () => {
  const client = createRecordingClient({ userId: null });
  await assert.rejects(() => getProfile(client), SignedOutError);
  assert.equal(client.calls.length, 0);
});

test("getProfile always filters by the session owner_id", async () => {
  const client = createRecordingClient({ userId: SESSION_ID, data: null });
  await getProfile(client);
  assert.equal(client.calls.length, 1);
  assert.equal(client.calls[0]?.table, "profiles");
  assert.equal(client.calls[0]?.op, "select");
  assertEveryCallScopedTo(client.calls, SESSION_ID);
});

test("upsertProfile writes owner_id from the session, never DEFAULT_OWNER_ID", async () => {
  const client = createRecordingClient({ userId: SESSION_ID, data: null });
  await upsertProfile(sampleWrite, client);
  const write = client.calls.find((call) => call.op === "upsert" || call.op === "insert");
  assert.ok(write);
  const row = write.rows[0] as { owner_id: string };
  assert.equal(row.owner_id, SESSION_ID);
  assert.notEqual(row.owner_id, DEFAULT_OWNER_ID);
  assertEveryCallScopedTo(client.calls, SESSION_ID);
});

test("upsertProfile overwrites a caller-supplied owner_id with the session id", async () => {
  const client = createRecordingClient({ userId: SESSION_ID, data: null });
  await upsertProfile(
    { ...sampleWrite, ownerId: DEFAULT_OWNER_ID } as typeof sampleWrite & {
      ownerId: string;
    },
    client,
  );
  const write = client.calls.find((call) => call.op === "upsert" || call.op === "insert");
  assert.ok(write);
  assert.equal((write.rows[0] as { owner_id: string }).owner_id, SESSION_ID);
});
