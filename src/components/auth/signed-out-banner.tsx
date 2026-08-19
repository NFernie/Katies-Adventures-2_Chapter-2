"use client";

import {
  MissingSupabaseNote,
  SignedOutEmpty,
} from "@/components/auth/signed-out-empty";
import { useAuthSession } from "@/components/auth/use-auth-session";

export function SignedOutBanner() {
  const { status } = useAuthSession();
  if (status === "missing-config") {
    return (
      <>
        <SignedOutEmpty />
        <MissingSupabaseNote />
      </>
    );
  }
  if (status !== "signed-out") return null;
  return <SignedOutEmpty />;
}
