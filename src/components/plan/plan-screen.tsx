"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { SignedOutBanner } from "@/components/auth/signed-out-banner";
import { useAuthSession } from "@/components/auth/use-auth-session";
import { goalFromVersion } from "@/components/plan/goal-snapshot";
import { RegenerateSheet } from "@/components/plan/regenerate-sheet";
import { WeekStrip } from "@/components/plan/week-strip";
import { TimelineRail } from "@/components/log/timeline-rail";
import {
  RouteGate,
  type RouteLoadState,
} from "@/components/shell/route-status";
import { Button } from "@/components/ui/button";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import {
  getProfile,
  listCheckIns,
  listPlanVersions,
  listTrainingDays,
  type CheckIn,
  type PlanVersion,
  type Profile,
  type TrainingDay,
} from "@/data";
import { previewRemainingTimeline } from "@/engine";

export function PlanScreen() {
  const router = useRouter();
  const { status } = useAuthSession();
  const [version, setVersion] = useState<PlanVersion | null>(null);
  const [versions, setVersions] = useState<PlanVersion[]>([]);
  const [days, setDays] = useState<TrainingDay[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [loadState, setLoadState] = useState<RouteLoadState>("loading");
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    if (status !== "signed-in") {
      return {
        versions: [] as PlanVersion[],
        days: [] as TrainingDay[],
        profile: null as Profile | null,
        checkIns: [] as CheckIn[],
      };
    }
    const [rows, trainingDays, nextProfile, nextCheckIns] = await Promise.all([
      listPlanVersions(),
      listTrainingDays(),
      getProfile(),
      listCheckIns(),
    ]);
    return {
      versions: rows,
      days: trainingDays,
      profile: nextProfile,
      checkIns: nextCheckIns,
    };
  }, [status]);

  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;
    void (async () => {
      if (status === "signed-in") setLoadState("loading");
      try {
        const next = await load();
        if (cancelled) return;
        setVersions(next.versions);
        setVersion(next.versions[0] ?? null);
        setDays(next.days);
        setProfile(next.profile);
        setCheckIns(next.checkIns);
        setLoadState("ready");
      } catch {
        if (cancelled) return;
        setLoadState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, load, attempt]);

  const shown = status === "signed-in" ? version : null;
  const shownDays = status === "signed-in" ? days : [];
  const shownVersions = status === "signed-in" ? versions : [];
  const shownProfile = status === "signed-in" ? profile : null;
  const shownCheckIns = status === "signed-in" ? checkIns : [];
  const goal = goalFromVersion(shown);
  const latest = shownCheckIns[0];
  const currentKg = latest?.weightKg ?? shownProfile?.weightKg ?? null;
  const preview = useMemo(() => {
    if (currentKg == null || !goal.endOn) return null;
    return previewRemainingTimeline({
      currentWeightKg: currentKg,
      targetWeightKg: goal.targetWeightKg,
      asOf: latest?.loggedOn ?? new Date().toISOString().slice(0, 10),
      endOn: goal.endOn,
      weeklyLossCapPct: goal.weeklyLossCapPct,
    });
  }, [currentKg, goal.endOn, goal.targetWeightKg, goal.weeklyLossCapPct, latest?.loggedOn]);

  return (
    <main>
      <p className="font-sans text-[13px] font-semibold text-iron-2">
        Current plan
      </p>
      <h1 className="mt-1 font-display text-[1.85rem] leading-[1.1] font-bold tracking-[-0.03em]">
        Plan
      </h1>
      <SignedOutBanner />
      <RouteGate
        loadState={loadState}
        onRetry={() => {
          setLoadState("loading");
          setAttempt((n) => n + 1);
        }}
      >
      <BentoGrid className="mt-4">
        <BentoGridItem
          title="Energy"
          description={shown ? `${shown.energyKcal} kcal` : "— kcal"}
        />
        <BentoGridItem
          title="Protein"
          description={shown ? `${shown.proteinG} g` : "— g"}
        />
        <BentoGridItem
          className="col-span-2"
          title="Split"
          description={shown ? shown.splitId.split("_").join(" ") : "—"}
        />
      </BentoGrid>
      <p className="mt-4 font-sans text-[16px] leading-[1.45]">
        Cardio is chosen by the generator for the goal. Same movement rules for
        male and female. Each session uses that day’s setting. Unsafe speed is
        the only block.
      </p>
      <WeekStrip days={shownDays} />
      {goal.startOn ? (
        <div className="mt-4">
          <p className="mb-2 font-sans text-[13px] font-semibold text-iron-2">
            Remaining timeline
          </p>
          <TimelineRail
            startOn={goal.startOn}
            startKg={shownProfile?.weightKg ?? null}
            endOn={goal.endOn}
            checkIns={[...shownCheckIns].sort((a, b) => (a.loggedOn < b.loggedOn ? -1 : 1))}
            preview={preview}
          />
        </div>
      ) : null}
      <section className="mt-4 border-t border-iron pt-3">
        <p className="font-sans text-[13px] font-semibold text-iron-2">History</p>
        <p className="mt-1 font-sans text-[14px] leading-[1.45] text-iron-2">
          Older weeks stay frozen. Today and Session always load the current
          version.
        </p>
        {shownVersions.length === 0 ? (
          <p className="mt-2 font-sans text-[16px] leading-[1.45] text-iron-2">
            No versions yet. Generate from onboarding.
          </p>
        ) : (
          <ul className="mt-2">
            {shownVersions.map((row, index) => (
              <li
                key={row.id}
                className="flex min-h-11 items-center justify-between border-b border-hair"
              >
                <span className="font-sans text-[16px] font-semibold">
                  Version {row.versionN}
                  {index === 0 ? " · current" : " · read-only"}
                </span>
                <span className="font-sans text-[14px] text-live tabular-nums">
                  {row.energyKcal} kcal
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Button
        type="button"
        className="mt-4 w-full"
        disabled={status !== "signed-in"}
        onClick={() => setConfirm(true)}
      >
        Regenerate
      </Button>
      <RegenerateSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          router.push("/onboarding");
        }}
      />
      </RouteGate>
    </main>
  );
}
