"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { SignedOutBanner } from "@/components/auth/signed-out-banner";
import { useAuthSession } from "@/components/auth/use-auth-session";
import { goalFromVersion } from "@/components/plan/goal-snapshot";
import { CheckInForm } from "@/components/log/check-in-form";
import { TimelineRail } from "@/components/log/timeline-rail";
import { PrintoutStrip } from "@/components/shell/printout-strip";
import {
  RouteGate,
  type RouteLoadState,
} from "@/components/shell/route-status";
import {
  deleteCheckIn,
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
  const [loadState, setLoadState] = useState<RouteLoadState>("loading");
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    if (status !== "signed-in") {
      return { profile: null, version: null, checkIns: [] as CheckIn[] };
    }
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
  }, [status]);

  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;
    const id = window.setTimeout(() => {
      void (async () => {
        if (status === "signed-in") setLoadState("loading");
        try {
          const next = await load();
          if (cancelled) return;
          setProfile(next.profile);
          setVersion(next.version);
          setCheckIns(next.checkIns);
          setLoadState("ready");
        } catch {
          if (cancelled) return;
          setLoadState("error");
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [status, load, attempt]);

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
        Weekly BodyID
      </h1>
      <SignedOutBanner />
      <RouteGate
        loadState={loadState}
        onRetry={() => {
          setLoadState("loading");
          setAttempt((n) => n + 1);
        }}
      >
      <p className="mt-2 mb-4 font-sans text-[16px] leading-[1.45] text-iron-2">
        Weekly InBody / Tanita check-in. Weight, body fat %, skeletal muscle
        mass. No photos. No wearables. Any date is allowed; the rail uses the
        latest weight.
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
          Sign in to save a check-in.
        </p>
      )}
      {status === "signed-in" && shownCheckIns.length > 0 ? (
        <section className="mt-6 border-t border-iron pt-3">
          <p className="font-sans text-[13px] font-semibold text-iron-2">
            Saved check-ins
          </p>
          <ul className="mt-2">
            {shownCheckIns.map((row) => (
              <li
                key={row.id}
                className="flex min-h-11 items-center justify-between gap-3 border-b border-hair"
              >
                <span className="font-sans text-[16px] font-semibold tabular-nums">
                  {row.loggedOn} · {row.weightKg} kg
                </span>
                <button
                  type="button"
                  disabled={busy}
                  className="min-h-11 shrink-0 font-sans text-[14px] font-semibold text-live disabled:opacity-50"
                  onClick={() => {
                    void (async () => {
                      setBusy(true);
                      try {
                        await deleteCheckIn(row.id);
                        const next = await load();
                        setProfile(next.profile);
                        setVersion(next.version);
                        setCheckIns(next.checkIns);
                      } finally {
                        setBusy(false);
                      }
                    })();
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      </RouteGate>
    </main>
  );
}
