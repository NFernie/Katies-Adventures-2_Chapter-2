import assert from "node:assert/strict";
import test from "node:test";

import { sendMagicLink } from "./auth.ts";
import { SignedOutError } from "./errors.ts";
import { getProfile } from "./profiles.ts";
import { createRecordingClient } from "./recording-client.ts";

test("incognito (no session) cannot read personal profile rows", async () => {
  const hidden = {
    owner_id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    height_cm: 178,
    weight_kg: 86,
  };
  const incognito = createRecordingClient({ userId: null, data: hidden });
  await assert.rejects(() => getProfile(incognito), SignedOutError);
  assert.equal(incognito.calls.length, 0);
});

test("sendMagicLink uses email OTP (magic link), not a password grant", async () => {
  const calls: unknown[] = [];
  const client = {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      signInWithOtp: async (args: unknown) => {
        calls.push(args);
        return { error: null };
      },
      signOut: async () => ({ error: null }),
    },
    from() {
      throw new Error("auth must not query tables");
    },
  };
  await sendMagicLink("owner@example.com", {
    client,
    emailRedirectTo: "https://nfernie.github.io/Katies-Adventures-2_Chapter-2/lock/",
  });
  assert.equal(calls.length, 1);
  const args = calls[0] as {
    email: string;
    options: { emailRedirectTo: string; shouldCreateUser: boolean };
  };
  assert.equal(args.email, "owner@example.com");
  assert.match(args.options.emailRedirectTo, /\/lock\/?$/);
  assert.equal(args.options.shouldCreateUser, true);
});
