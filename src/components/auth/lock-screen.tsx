"use client";

import Link from "next/link";

import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { MissingSupabaseNote } from "@/components/auth/signed-out-empty";
import { useAuthSession } from "@/components/auth/use-auth-session";
import { Disclaimer } from "@/components/shell/copy";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LockScreen() {
  const { status } = useAuthSession();

  return (
    <main>
      <p className="font-sans text-[13px] font-semibold text-iron-2">Sign in</p>
      {status === "signed-in" ? (
        <>
          <h1 className="mt-1 font-display text-[1.85rem] leading-[1.1] font-bold tracking-[-0.03em]">
            You are in
          </h1>
          <p className="mt-3 font-sans text-[16px] leading-[1.45] text-iron-2">
            The magic-link session is on this device. Personal rows now use
            your Auth user id as owner_id.
          </p>
          <Link href="/settings" className={cn(buttonVariants(), "mt-4 inline-flex")}>
            Open You
          </Link>
        </>
      ) : (
        <>
          <h1 className="mt-1 font-display text-[1.85rem] leading-[1.1] font-bold tracking-[-0.03em]">
            Check your email
          </h1>
          <p className="mt-3 font-sans text-[16px] leading-[1.45] text-iron-2">
            We sent a sign-in link. Open it on this device. No password. If
            you have not asked for a link yet, send one below.
          </p>
        </>
      )}
      {status === "missing-config" ? <MissingSupabaseNote /> : null}
      {status === "signed-out" ? <MagicLinkForm redirectOnSend={false} /> : null}
      <Disclaimer />
    </main>
  );
}
