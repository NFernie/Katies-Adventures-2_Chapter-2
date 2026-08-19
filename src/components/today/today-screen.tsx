"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SignedOutBanner } from "@/components/auth/signed-out-banner";
import { useAuthSession } from "@/components/auth/use-auth-session";
import { Disclaimer } from "@/components/shell/copy";
import { LoadedBar } from "@/components/shell/loaded-bar";
import { PrintoutStrip } from "@/components/shell/printout-strip";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getProfile, listPlanVersions, type PlanVersion, type Profile } from "@/data";

const DUMMY = [
  { slot: "Breakfast", name: "Oats (placeholder)" },
  { slot: "Lunch", name: "Rice bowl (placeholder)" },
  { slot: "Dinner", name: "Chicken plate (placeholder)" },
  { slot: "Snack", name: "Yogurt (placeholder)" },
];

export function TodayScreen() {
  const { status } = useAuthSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [version, setVersion] = useState<PlanVersion | null>(null);

  useEffect(() => {
    if (status !== "signed-in") return;
    let cancelled = false;
    void Promise.all([getProfile(), listPlanVersions()])
      .then(([nextProfile, versions]) => {
        if (cancelled) return;
        setProfile(nextProfile);
        setVersion(versions[0] ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setProfile(null);
        setVersion(null);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const shownProfile = status === "signed-in" ? profile : null;
  const shownVersion = status === "signed-in" ? version : null;
  const hasPlan = Boolean(shownVersion);

  return (
    <main>
      <p className="font-sans text-[13px] font-semibold text-iron-2">
        {hasPlan ? "Today" : "No plan yet"}
      </p>
      <h1 className="mt-1 font-display text-[1.85rem] leading-[1.1] font-bold tracking-[-0.03em]">
        Today
      </h1>
      <SignedOutBanner />
      <PrintoutStrip
        weight={shownProfile ? `${shownProfile.weightKg} kg` : "— kg"}
        bodyFat={shownProfile ? `${shownProfile.bodyFatPct} %` : "— %"}
        smm={shownProfile ? `${shownProfile.skeletalMuscleMassKg} kg` : "— kg"}
      />
      <LoadedBar />
      <section className="border-t border-iron">
        {DUMMY.map((meal) => (
          <article key={meal.slot} className="border-b border-iron py-3">
            <p className="grid grid-cols-[1fr_auto_auto] gap-2.5 font-sans text-[12px] font-bold tracking-[0.04em] text-iron-2 uppercase">
              <span>{meal.slot}</span>
              <span className="text-live tabular-nums">
                {shownVersion ? `${Math.round(shownVersion.energyKcal / 4)} kcal` : "— kcal"}
              </span>
              <span className="text-live tabular-nums">
                {shownVersion ? `${Math.round(shownVersion.proteinG / 4)} p` : "— p"}
              </span>
            </p>
            <h2 className="font-sans text-[1.05rem] font-bold">
              {hasPlan ? meal.name : "After generate"}
            </h2>
            <div className="mt-2 flex gap-2">
              <Button variant="outline" type="button" disabled>
                Swap
              </Button>
              <Button type="button" disabled>
                Ate it
              </Button>
            </div>
          </article>
        ))}
      </section>
      <div className="h-7" aria-hidden />
      <p className="font-sans text-[16px] leading-[1.45]">
        Dummy meal titles until the USDA catalog. Each session uses that day’s
        setting. Saved personal data stays hidden until a magic-link session
        exists.
      </p>
      <Link
        href="/onboarding"
        className={cn(buttonVariants(), "mt-4 inline-flex")}
      >
        {hasPlan ? "Regenerate" : "Start onboarding"}
      </Link>
      <Disclaimer />
    </main>
  );
}
