"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { SignedOutBanner } from "@/components/auth/signed-out-banner";
import { useAuthSession } from "@/components/auth/use-auth-session";
import { MealCard } from "@/components/meals/meal-card";
import { SwapSheet } from "@/components/meals/swap-sheet";
import { sessionHeadline } from "@/components/session/labels";
import { WorkoutModule } from "@/components/session/workout-module";
import { RegenerateSheet } from "@/components/plan/regenerate-sheet";
import { LoadedBar } from "@/components/shell/loaded-bar";
import { PrintoutStrip } from "@/components/shell/printout-strip";
import {
  RouteGate,
  type RouteLoadState,
} from "@/components/shell/route-status";
import { buttonVariants } from "@/components/ui/button";
import { CATALOG_EXERCISES } from "@/catalog/exercises";
import { CATALOG_RECIPES, catalogSeeded } from "@/catalog/recipes";
import { cn } from "@/lib/utils";
import {
  getProfile,
  listCurrentDayPlans,
  listMealSlotsForDay,
  listPlanVersions,
  listWorkoutItems,
  listWorkoutSessionForDay,
  pinMealSlot,
  setMealEaten,
  swapMealSlot,
  type MealSlotRow,
  type PlanVersion,
  type Profile,
  type WorkoutItemRow,
  type WorkoutSessionRow,
} from "@/data";
import {
  plateNutrition,
  MEAL_SLOTS,
  SLOT_SHARE,
  swapCandidates,
  type DietFlag,
  type KitchenFlag,
  type MealSlot,
} from "@/engine";

const EMPTY_EATEN: Record<MealSlot, boolean> = {
  breakfast: false,
  lunch: false,
  dinner: false,
  snack: false,
};

type TodayPayload = {
  profile: Profile | null;
  version: PlanVersion | null;
  meals: MealSlotRow[];
  session: WorkoutSessionRow | null;
  workoutItems: WorkoutItemRow[];
  deload: boolean;
  daySetting: string;
};

function emptyToday(): TodayPayload {
  return {
    profile: null,
    version: null,
    meals: [],
    session: null,
    workoutItems: [],
    deload: false,
    daySetting: "rest",
  };
}

export function TodayScreen() {
  const router = useRouter();
  const { status } = useAuthSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [version, setVersion] = useState<PlanVersion | null>(null);
  const [meals, setMeals] = useState<MealSlotRow[]>([]);
  const [swapSlot, setSwapSlot] = useState<MealSlot | null>(null);
  const [session, setSession] = useState<WorkoutSessionRow | null>(null);
  const [workoutItems, setWorkoutItems] = useState<WorkoutItemRow[]>([]);
  const [deload, setDeload] = useState(false);
  const [daySetting, setDaySetting] = useState("rest");
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [loadState, setLoadState] = useState<RouteLoadState>("loading");
  const [attempt, setAttempt] = useState(0);

  const fetchToday = useCallback(async (): Promise<TodayPayload> => {
    if (status !== "signed-in") return emptyToday();
    const [nextProfile, versions, days] = await Promise.all([
      getProfile(),
      listPlanVersions(),
      listCurrentDayPlans(),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const day = days.find((row) => row.onDate === today) ?? days[0];
    const nextMeals = day ? await listMealSlotsForDay(day.id) : [];
    const nextSession = day ? await listWorkoutSessionForDay(day.id) : null;
    const nextItems = nextSession ? await listWorkoutItems(nextSession.id) : [];
    return {
      profile: nextProfile,
      version: versions[0] ?? null,
      meals: nextMeals,
      session: nextSession,
      workoutItems: nextItems,
      deload: day?.isDeload ?? false,
      daySetting: day?.trainingSetting ?? (nextSession?.setting ?? "rest"),
    };
  }, [status]);

  const applyToday = useCallback((next: TodayPayload) => {
    setProfile(next.profile);
    setVersion(next.version);
    setMeals(next.meals);
    setSession(next.session);
    setWorkoutItems(next.workoutItems);
    setDeload(next.deload);
    setDaySetting(next.daySetting);
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;
    const id = window.setTimeout(() => {
      void (async () => {
        if (status === "signed-in") setLoadState("loading");
        try {
          const next = await fetchToday();
          if (cancelled) return;
          applyToday(next);
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
  }, [status, fetchToday, applyToday, attempt]);

  const shownProfile = status === "signed-in" ? profile : null;
  const shownVersion = status === "signed-in" ? version : null;
  const shownSession = status === "signed-in" ? session : null;
  const shownWorkoutItems = status === "signed-in" ? workoutItems : [];
  const shownMeals = useMemo(
    () => (status === "signed-in" ? meals : []),
    [status, meals],
  );
  const hasPlan = Boolean(shownVersion);
  const canAct = status === "signed-in";

  const eaten = useMemo(() => {
    const next = { ...EMPTY_EATEN };
    for (const meal of shownMeals) next[meal.slot] = meal.eaten;
    return next;
  }, [shownMeals]);

  const swapping = shownMeals.find((meal) => meal.slot === swapSlot);
  const candidates = swapSlot
    ? swapCandidates({
        slot: swapSlot,
        currentSlug: swapping?.recipeSlug ?? "",
        recipes: CATALOG_RECIPES,
        dietFlags: (shownProfile?.dietFlags ?? []) as DietFlag[],
        kitchenFlags: (shownProfile?.kitchenFlags ?? []) as KitchenFlag[],
        targetKcal: (shownVersion?.energyKcal ?? 0) * SLOT_SHARE[swapSlot],
        targetProteinG: (shownVersion?.proteinG ?? 0) * SLOT_SHARE[swapSlot],
      })
    : [];

  function rowFor(slot: MealSlot): MealSlotRow | undefined {
    return shownMeals.find((meal) => meal.slot === slot);
  }

  function refreshSilently() {
    void fetchToday()
      .then(applyToday)
      .catch(() => {});
  }

  return (
    <main>
      <p className="font-sans text-[13px] font-semibold text-iron-2">
        {loadState === "ready" && !hasPlan ? "No plan yet" : "Today"}
      </p>
      <h1 className="mt-1 font-display text-[1.85rem] leading-[1.1] font-bold tracking-[-0.03em]">
        Today
      </h1>
      <SignedOutBanner />
      <RouteGate
        loadState={loadState}
        onRetry={() => {
          setLoadState("loading");
          setAttempt((n) => n + 1);
        }}
      >
        <PrintoutStrip
          weight={shownProfile ? `${shownProfile.weightKg} kg` : "— kg"}
          bodyFat={shownProfile ? `${shownProfile.bodyFatPct} %` : "— %"}
          smm={shownProfile ? `${shownProfile.skeletalMuscleMassKg} kg` : "— kg"}
        />
        <LoadedBar
          eaten={eaten}
          onToggle={
            canAct
              ? (slot) => {
                  const row = rowFor(slot);
                  if (!row) return;
                  void setMealEaten(row.id, !row.eaten)
                    .then(refreshSilently)
                    .catch(() => {});
                }
              : undefined
          }
        />
        {!catalogSeeded ? (
          <p role="status" className="mb-3 font-sans text-[16px] leading-[1.45] text-iron-2">
            Meals wait on the USDA catalog. Get a data.gov FDC key with{" "}
            <code className="font-semibold">bash scripts/wizard-usda-fdc.sh</code>
            , then enrich. The catalog is not done.
          </p>
        ) : null}
        <section className="border-t border-iron">
          {MEAL_SLOTS.map((slot) => {
            const row = rowFor(slot);
            const recipe = CATALOG_RECIPES.find((item) => item.slug === row?.recipeSlug);
            const emptySlot = Boolean(row?.recipeSlug.startsWith("empty-"));
            const servingsScale = recipe
              ? (shownProfile?.servings ?? 1) / Math.max(recipe.servings, 1)
              : 1;
            const plate = recipe
              ? plateNutrition(recipe, shownProfile?.servings ?? 1)
              : null;
            return (
              <MealCard
                key={slot}
                slot={slot}
                title={
                  recipe?.title ??
                  (emptySlot
                    ? "No USDA-checked meal in this slot yet"
                    : hasPlan
                      ? row?.recipeSlug.replace(/-/g, " ") ?? "After generate"
                      : "After generate")
                }
                kcal={plate?.kcal ?? null}
                proteinG={plate?.proteinG ?? null}
                eaten={row?.eaten ?? false}
                pinned={row?.pinned ?? false}
                canSwap={Boolean(catalogSeeded && row && canAct && !emptySlot)}
                canAct={Boolean(row && canAct)}
                ingredients={recipe?.ingredients}
                steps={recipe?.steps}
                sourceKind={recipe?.sourceKind}
                sourceAttribution={recipe?.sourceAttribution}
                sourceUrl={recipe?.sourceUrl}
                servingsScale={servingsScale}
                onSwap={() => setSwapSlot(slot)}
                onAte={() => {
                  if (!row) return;
                  void setMealEaten(row.id, !row.eaten)
                    .then(refreshSilently)
                    .catch(() => {});
                }}
                onPin={() => {
                  if (!row) return;
                  void pinMealSlot(row.id, !row.pinned)
                    .then(refreshSilently)
                    .catch(() => {});
                }}
              />
            );
          })}
        </section>
        <div className="h-7" aria-hidden />
        <WorkoutModule
          title={
            shownSession
              ? sessionHeadline({
                  focus: shownSession.focus,
                  setting: shownSession.setting,
                  cardio: shownSession.cardio,
                })
              : "Rest"
          }
          setting={shownSession?.setting ?? (status === "signed-in" ? daySetting : "rest")}
          moveCount={shownWorkoutItems.length}
          moves={shownWorkoutItems.map((item) => {
            const exercise = CATALOG_EXERCISES.find((row) => row.slug === item.exerciseSlug);
            return exercise?.title ?? item.exerciseSlug.replace(/-/g, " ");
          })}
          deload={status === "signed-in" ? deload : false}
          empty={!shownSession || shownWorkoutItems.length === 0}
        />
        {hasPlan ? (
          <button
            type="button"
            className={cn(buttonVariants(), "mt-4 inline-flex")}
            onClick={() => setConfirmRegen(true)}
          >
            Regenerate
          </button>
        ) : (
          <Link href="/onboarding" className={cn(buttonVariants(), "mt-4 inline-flex")}>
            Start onboarding
          </Link>
        )}
        <RegenerateSheet
          open={confirmRegen}
          onClose={() => setConfirmRegen(false)}
          onConfirm={() => {
            setConfirmRegen(false);
            router.push("/onboarding");
          }}
        />
        <SwapSheet
          slot={swapSlot ?? "breakfast"}
          open={swapSlot != null}
          candidates={candidates}
          householdServings={shownProfile?.servings ?? 1}
          emptyReason={
            catalogSeeded
              ? "No other USDA-checked meal in this slot after your diet and kitchen filters."
              : "No USDA-checked swaps yet. Catalog is not done."
          }
          onClose={() => setSwapSlot(null)}
          onPick={(slug) => {
            if (!swapping) return;
            void swapMealSlot(swapping.id, slug)
              .then(() => {
                setSwapSlot(null);
                return fetchToday().then(applyToday);
              })
              .catch(() => {});
          }}
        />
      </RouteGate>
    </main>
  );
}
