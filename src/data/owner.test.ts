import assert from "node:assert/strict";
import test from "node:test";

import { SignedOutError } from "./errors.ts";
import { DEFAULT_OWNER_ID, getOwnerId } from "./owner.ts";

function sessionClient(userId: string | null) {
  return {
    auth: {
      getSession: async () => ({
        data: { session: userId ? { user: { id: userId } } : null },
      }),
    },
  };
}

test("getOwnerId returns the signed-in session user id", async () => {
  const sessionId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  assert.equal(await getOwnerId(sessionClient(sessionId)), sessionId);
});

test("getOwnerId throws SignedOutError when there is no session", async () => {
  await assert.rejects(
    () => getOwnerId(sessionClient(null)),
    (err: unknown) => {
      assert.ok(err instanceof SignedOutError);
      return true;
    },
  );
});

test("getOwnerId does not fall back to DEFAULT_OWNER_ID when signed out", async () => {
  await assert.rejects(() => getOwnerId(sessionClient(null)), SignedOutError);
  assert.equal(
    DEFAULT_OWNER_ID,
    "198e5a49-c748-4bcc-b6ad-86445a76eb7b",
  );
});
