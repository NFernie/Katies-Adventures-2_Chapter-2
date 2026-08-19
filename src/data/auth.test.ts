import assert from "node:assert/strict";
import test from "node:test";

import { sendMagicLink, completeAuthFromUrl } from "./auth.ts";
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

test("completeAuthFromUrl verifies a token_hash magic link", async () => {
  const verified: unknown[] = [];
  const client = {
    auth: {
      getSession: async () => ({
        data: {
          session: verified.length
            ? { user: { id: "11111111-2222-4333-8444-555555555555" } }
            : null,
        },
      }),
      signInWithOtp: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
      verifyOtp: async (args: unknown) => {
        verified.push(args);
        return { error: null };
      },
    },
    from() {
      throw new Error("auth must not query tables");
    },
  };
  const session = await completeAuthFromUrl({
    client,
    href: "https://nfernie.github.io/Katies-Adventures-2_Chapter-2/lock/?token_hash=abc&type=magiclink",
  });
  assert.equal(verified.length, 1);
  assert.deepEqual(verified[0], { token_hash: "abc", type: "magiclink" });
  assert.equal(session?.user.id, "11111111-2222-4333-8444-555555555555");
});

test("completeAuthFromUrl exchanges a PKCE code leftover in the URL", async () => {
  const exchanged: string[] = [];
  const client = {
    auth: {
      getSession: async () => ({
        data: {
          session: exchanged.length
            ? { user: { id: "11111111-2222-4333-8444-555555555555" } }
            : null,
        },
      }),
      signInWithOtp: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
      exchangeCodeForSession: async (code: string) => {
        exchanged.push(code);
        return { error: null };
      },
    },
    from() {
      throw new Error("auth must not query tables");
    },
  };
  const session = await completeAuthFromUrl({
    client,
    href: "https://nfernie.github.io/Katies-Adventures-2_Chapter-2/lock/?code=pkce-code",
  });
  assert.deepEqual(exchanged, ["pkce-code"]);
  assert.equal(session?.user.id, "11111111-2222-4333-8444-555555555555");
});
