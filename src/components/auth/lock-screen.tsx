"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { MissingSupabaseNote } from "@/components/auth/signed-out-empty";
import { useAuthSession } from "@/components/auth/use-auth-session";
import { RouteStatus } from "@/components/shell/route-status";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { completeAuthFromUrl, MAGIC_LINK_SENT_KEY } from "@/data";

export function LockScreen() {
  const { status } = useAuthSession();
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  useEffect(() => {
    void completeAuthFromUrl()
      .catch((caught) => {
        setCallbackError(
          caught instanceof Error
            ? caught.message
            : "Could not open this magic link.",
        );
      })
      .finally(() => {
        if (typeof sessionStorage !== "undefined") {
          setJustSent(sessionStorage.getItem(MAGIC_LINK_SENT_KEY) === "1");
        }
      });
  }, []);

  useEffect(() => {
    if (status === "signed-in" && typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(MAGIC_LINK_SENT_KEY);
    }
  }, [status]);

  return (
    <main>
      <p className="font-sans text-[13px] font-semibold text-iron-2">Sign in</p>
      {status === "loading" ? (
        <RouteStatus loading loadingLabel="Opening your session…" />
      ) : status === "signed-in" ? (
        <>
          <h1 className="mt-1 font-display text-[1.85rem] leading-[1.1] font-bold tracking-[-0.03em]">
            You are in
          </h1>
          <p className="mt-3 font-sans text-[16px] leading-[1.45] text-iron-2">
            The magic-link session is on this device. Open You to see your
            profile. Personal rows use your Auth user id as owner_id.
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
            {justSent
              ? "We sent a sign-in link. Open it in this same browser. Do not send another unless that one expired."
              : "Open the emailed magic link in this browser to sign in to your profile. No password."}
          </p>
          {callbackError ? (
            <p role="alert" className="mt-3 font-sans text-[14px] text-alert">
              {callbackError} Send a new link from this browser, then open that
              email here.
            </p>
          ) : null}
        </>
      )}
      {status === "missing-config" ? <MissingSupabaseNote /> : null}
      {status === "signed-out" ? (
        <details className="mt-4">
          <summary className="min-h-11 cursor-pointer font-sans text-[14px] font-semibold">
            Send a new magic link
          </summary>
          <MagicLinkForm redirectOnSend={false} />
        </details>
      ) : null}
    </main>
  );
}
