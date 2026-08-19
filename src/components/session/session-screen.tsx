"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CATALOG_EXERCISES } from "@/catalog/exercises";
import { SignedOutBanner } from "@/components/auth/signed-out-banner";
import { useAuthSession } from "@/components/auth/use-auth-session";
import { sessionHeadline } from "@/components/session/labels";
import { SetTable } from "@/components/session/set-table";
import { SwapLiftSheet } from "@/components/session/swap-lift-sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  completeWorkoutItem,
  isSkippedSets,
  listCurrentDayPlans,
  listWorkoutItems,
  listWorkoutSessionForDay,
  saveWorkoutSets,
  skipWorkoutItem,
  swapWorkoutItem,
  type WorkoutItemRow,
  type WorkoutSessionRow,
  type WorkoutSetRow,
} from "@/data";
import { swapLiftCandidates } from "@/engine";

export function SessionScreen() {
  const router = useRouter();
  const { status } = useAuthSession();
  const [session, setSession] = useState<WorkoutSessionRow | null>(null);
  const [items, setItems] = useState<WorkoutItemRow[]>([]);
  const [deload, setDeload] = useState(false);
  const [index, setIndex] = useState(0);
  const [sets, setSets] = useState<WorkoutSetRow[]>([]);
  const [swapOpen, setSwapOpen] = useState(false);

  const load = useCallback(async () => {
    if (status !== "signed-in") {
      return { session: null, items: [] as WorkoutItemRow[], deload: false };
    }
    try {
      const days = await listCurrentDayPlans();
      const today = new Date().toISOString().slice(0, 10);
      const day = days.find((row) => row.onDate === today) ?? days[0];
      if (!day) return { session: null, items: [] as WorkoutItemRow[], deload: false };
      const nextSession = await listWorkoutSessionForDay(day.id);
      const nextItems = nextSession ? await listWorkoutItems(nextSession.id) : [];
      return { session: nextSession, items: nextItems, deload: day.isDeload };
    } catch {
      return { session: null, items: [] as WorkoutItemRow[], deload: false };
    }
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      void (async () => {
        const next = await load();
        if (cancelled) return;
        setSession(next.session);
        setItems(next.items);
        setDeload(next.deload);
        setIndex(0);
        const first = next.items[0];
        setSets(first && !isSkippedSets(first.sets) ? first.sets : []);
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [load]);

  const current = items[index];
  const exercise = CATALOG_EXERCISES.find((row) => row.slug === current?.exerciseSlug);
  const skipped = current ? isSkippedSets(current.sets) : false;

  const candidates = useMemo(() => {
    if (!exercise || !session) return [];
    return swapLiftCandidates({
      currentSlug: exercise.slug,
      pattern: exercise.pattern,
      setting: session.setting,
      catalog: CATALOG_EXERCISES,
    });
  }, [exercise, session]);

  function applyItem(nextItems: WorkoutItemRow[], nextIndex: number) {
    setItems(nextItems);
    setIndex(nextIndex);
    const row = nextItems[nextIndex];
    setSets(row && !isSkippedSets(row.sets) ? row.sets : []);
  }

  async function persistSets(next: WorkoutSetRow[]) {
    if (!current) return;
    setSets(next);
    await saveWorkoutSets(current.id, next);
  }

  async function goNext() {
    if (!current) return;
    if (!skipped) await completeWorkoutItem(current.id);
    if (index >= items.length - 1) {
      router.push("/");
      return;
    }
    applyItem(items, index + 1);
  }

  async function skip() {
    if (!current) return;
    await skipWorkoutItem(current.id);
    const nextItems = items.map((row) =>
      row.id === current.id
        ? { ...row, completed: true, sets: { skipped: true as const } }
        : row,
    );
    if (index >= items.length - 1) {
      router.push("/");
      return;
    }
    applyItem(nextItems, index + 1);
  }

  const headline = session
    ? sessionHeadline({
        focus: session.focus,
        setting: session.setting,
        cardio: session.cardio,
      })
    : "Session";

  return (
    <main>
      <Link
        href="/"
        className={cn(buttonVariants({ variant: "ghost" }), "mb-2 inline-flex px-0")}
      >
        Back
      </Link>
      <SignedOutBanner />
      <p className="font-sans text-[13px] font-semibold text-iron-2">
        {session
          ? `Exercise ${Math.min(index + 1, Math.max(items.length, 1))} of ${Math.max(items.length, 1)} · ${session.setting}`
          : "No session"}
      </p>
      <h1 className="mt-1 font-display text-[1.85rem] leading-[1.1] font-bold tracking-[-0.03em]">
        {exercise?.title ?? headline}
      </h1>
      {deload ? (
        <p className="mt-1 font-sans text-[14px] text-iron-2">
          Deload week. Planned sets × 0.6. Same movement rules for male and female.
        </p>
      ) : null}
      {exercise ? (
        <p className="mt-2 font-sans text-[16px] leading-[1.45] text-iron-2">
          {exercise.equipment.join(", ") || "none"} · {session?.setting} · Previous{" "}
          <span className="font-semibold text-live tabular-nums">—</span>
        </p>
      ) : (
        <p className="mt-2 font-sans text-[16px] leading-[1.45] text-iron-2">
          {status === "signed-in"
            ? "Rest day. No lifts to complete. Cardio is generator-chosen."
            : "Sign in to load today’s session."}
        </p>
      )}
      {exercise ? (
        <p className="mt-2 font-sans text-[16px] leading-[1.45]">{exercise.cue}</p>
      ) : null}
      {skipped ? (
        <p className="mt-4 font-sans text-[16px] text-iron-2">Skipped.</p>
      ) : sets.length > 0 ? (
        <SetTable sets={sets} onChange={(next) => void persistSets(next)} />
      ) : null}
      {current ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            type="button"
            disabled={!exercise || exercise.pattern === "zone2" || exercise.pattern === "intervals"}
            onClick={() => setSwapOpen(true)}
          >
            Swap lift
          </Button>
          <Button variant="outline" type="button" onClick={() => void skip()}>
            Skip
          </Button>
          <Button type="button" onClick={() => void goNext()}>
            {index >= items.length - 1 ? "Finish" : "Next exercise"}
          </Button>
        </div>
      ) : null}
      <SwapLiftSheet
        open={swapOpen}
        setting={session?.setting ?? ""}
        candidates={candidates}
        onClose={() => setSwapOpen(false)}
        onPick={(slug) => {
          if (!current) return;
          void swapWorkoutItem(current.id, slug).then(() =>
            load().then((next) => {
              setSession(next.session);
              applyItem(next.items, index);
              setSwapOpen(false);
            }),
          );
        }}
      />
    </main>
  );
}
