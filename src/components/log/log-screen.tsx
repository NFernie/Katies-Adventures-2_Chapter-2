"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { SignedOutBanner } from "@/components/auth/signed-out-banner";
import { useAuthSession } from "@/components/auth/use-auth-session";
import { goalFromVersion } from "@/components/plan/goal-snapshot";
import { CheckInForm } from "@/components/log/check-in-form";
import { TimelineRail } from "@/components/log/timeline-rail";
import { PrintoutStrip } from "@/components/shell/printout-strip";
import {
  getProfile,
  listCheckIns,
  listPlanVersions,
  upsertCheckIn,
  type CheckIn,
  type PlanVersion,
  type Profile,
} from "@/data";
import { previewRemainingTimeline, type RemainingTimeline } from "@/engine";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function LogScreen() {
  const { status } = useAuthSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [version, setVersion] = useState<PlanVersion | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (status !== "signed-in") {
      return { profile: null, version: null, checkIns: [] as CheckIn[] };
    }
    try {
      const [nextProfile, versions, nextCheckIns] = await Promise.all([
        getProfile(),
        listPlanVersions(),
        listCheckIns(),
      ]);
      return {
        profile: nextProfile,
        version: versions[0] ?? null,
        checkIns: nextCheckIns,
      };
    } catch {
      return { profile: null, version: null, checkIns: [] as CheckIn[] };
    }
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      void load().then((next) => {
        if (cancelled) return;
        setProfile(next.profile);
        setVersion(next.version);
        setCheckIns(next.checkIns);
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [load]);

  const shownProfile = status === "signed-in" ? profile : null;
  const shownVersion = status === "signed-in" ? version : null;
  const shownCheckIns = status === "signed-in" ? checkIns : [];
  const goal = goalFromVersion(shownVersion);
  const latest = shownCheckIns[0];
  const currentKg = latest?.weightKg ?? shownProfile?.weightKg ?? null;

  const preview: RemainingTimeline | null = useMemo(() => {
    if (currentKg == null || !goal.startOn || !goal.endOn) return null;
    return previewRemainingTimeline({
      currentWeightKg: currentKg,
      targetWeightKg: goal.targetWeightKg,
      asOf: latest?.loggedOn ?? todayIso(),
      endOn: goal.endOn,
      weeklyLossCapPct: goal.weeklyLossCapPct,
    });
  }, [currentKg, goal.endOn, goal.startOn, goal.targetWeightKg, goal.weeklyLossCapPct, latest?.loggedOn]);

  return (
    <main>
      <p className="font-sans text-[13px] font-semibold text-iron-2">Timeline</p>
      <h1 className="mt-1 font-display text-[1.85rem] leading-[1.1] font-bold tracking-[-0.03em]">
        Check-ins
      </h1>
      <SignedOutBanner />
      <p className="mt-2 mb-4 font-sans text-[16px] leading-[1.45] text-iron-2">
        Weight + BodyID fields. No photos. No wearables.
      </p>
      <PrintoutStrip
        weight={currentKg == null ? "— kg" : `${currentKg} kg`}
        bodyFat={
          latest
            ? `${latest.bodyFatPct} %`
            : shownProfile
              ? `${shownProfile.bodyFatPct} %`
              : "— %"
        }
        smm={
          latest
            ? `${latest.skeletalMuscleMassKg} kg`
            : shownProfile
              ? `${shownProfile.skeletalMuscleMassKg} kg`
              : "— kg"
        }
      />
      <TimelineRail
        startOn={goal.startOn || "—"}
        startKg={shownProfile?.weightKg ?? null}
        endOn={goal.endOn || "—"}
        checkIns={[...shownCheckIns].sort((a, b) => (a.loggedOn < b.loggedOn ? -1 : 1))}
        preview={preview}
      />
      {status === "signed-in" ? (
        <CheckInForm
          defaultDate={todayIso()}
          busy={busy}
          onSave={async (input) => {
            setBusy(true);
            try {
              await upsertCheckIn(input);
              const next = await load();
              setProfile(next.profile);
              setVersion(next.version);
              setCheckIns(next.checkIns);
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : (
        <p className="font-sans text-[16px] leading-[1.45] text-iron-2">
          Sign in with the magic link to save a check-in.
        </p>
      )}
    </main>
  );
}
