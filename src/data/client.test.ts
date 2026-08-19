import assert from "node:assert/strict";
import test from "node:test";

import {
  createBrowserClient,
  isSupabaseConfigured,
  resetBrowserClientForTests,
} from "./client.ts";

test("createBrowserClient throws when env is missing", () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  resetBrowserClientForTests();
  try {
    assert.equal(isSupabaseConfigured(), false);
    assert.throws(() => createBrowserClient(), /Supabase is not configured/);
  } finally {
    if (url) process.env.NEXT_PUBLIC_SUPABASE_URL = url;
    if (key) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = key;
    resetBrowserClientForTests();
  }
});

test("createBrowserClient refuses a service_role key", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "service_role-secret";
  resetBrowserClientForTests();
  try {
    assert.throws(() => createBrowserClient(), /service_role/);
  } finally {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    resetBrowserClientForTests();
  }
});
