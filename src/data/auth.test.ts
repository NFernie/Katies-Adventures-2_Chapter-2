import assert from "node:assert/strict";
import test from "node:test";

import {
  sendMagicLink,
  completeAuthFromUrl,
  signInWithEmail,
  signUpWithEmail,
  setAccountPassword,
} from "./auth.ts";
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

test("signInWithEmail uses a password grant and does not send a magic link", async () => {
  const otp: unknown[] = [];
  const passwords: unknown[] = [];
  const client = {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      signInWithOtp: async (args: unknown) => {
        otp.push(args);
        return { error: null };
      },
      signInWithPassword: async (args: unknown) => {
        passwords.push(args);
        return {
          data: {
            session: { user: { id: "11111111-2222-4333-8444-555555555555" } },
          },
          error: null,
        };
      },
      signOut: async () => ({ error: null }),
    },
    from() {
      throw new Error("auth must not query tables");
    },
  };
  const session = await signInWithEmail("owner@example.com", "correct-horse", {
    client,
  });
  assert.equal(otp.length, 0);
  assert.deepEqual(passwords, [
    { email: "owner@example.com", password: "correct-horse" },
  ]);
  assert.equal(session.user.id, "11111111-2222-4333-8444-555555555555");
});

test("signUpWithEmail sends a confirmation magic link and does not sign in yet", async () => {
  const signups: unknown[] = [];
  const otp: unknown[] = [];
  const client = {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      signInWithOtp: async (args: unknown) => {
        otp.push(args);
        return { error: null };
      },
      signUp: async (args: unknown) => {
        signups.push(args);
        return { data: { session: null, user: { id: "new" } }, error: null };
      },
      signOut: async () => ({ error: null }),
    },
    from() {
      throw new Error("auth must not query tables");
    },
  };
  await signUpWithEmail("owner@example.com", "correct-horse", {
    client,
    emailRedirectTo:
      "https://nfernie.github.io/Katies-Adventures-2_Chapter-2/lock/",
  });
  assert.equal(otp.length, 0);
  assert.equal(signups.length, 1);
  const args = signups[0] as {
    email: string;
    password: string;
    options: { emailRedirectTo: string };
  };
  assert.equal(args.email, "owner@example.com");
  assert.equal(args.password, "correct-horse");
  assert.match(args.options.emailRedirectTo, /\/lock\/?$/);
});

test("sendMagicLink is a one-time recovery link for an existing email", async () => {
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
  assert.equal(args.options.shouldCreateUser, false);
});

test("setAccountPassword updates the signed-in user password", async () => {
  const updates: unknown[] = [];
  const client = {
    auth: {
      getSession: async () => ({
        data: {
          session: { user: { id: "11111111-2222-4333-8444-555555555555" } },
        },
      }),
      signInWithOtp: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
      updateUser: async (args: unknown) => {
        updates.push(args);
        return { error: null };
      },
    },
    from() {
      throw new Error("auth must not query tables");
    },
  };
  await setAccountPassword("correct-horse", { client });
  assert.deepEqual(updates, [{ password: "correct-horse" }]);
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
