"use client";

import { useEffect, useState } from "react";

import {
  isSupabaseConfigured,
  subscribeToSession,
  type Session,
} from "@/data";

export type AuthStatus = "loading" | "missing-config" | "signed-out" | "signed-in";

export function useAuthSession() {
  const [status, setStatus] = useState<AuthStatus>(() =>
    isSupabaseConfigured() ? "loading" : "missing-config",
  );
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }
    return subscribeToSession((next) => {
      setSession(next);
      setStatus(next?.user.id ? "signed-in" : "signed-out");
    });
  }, []);

  return { status, session };
}
