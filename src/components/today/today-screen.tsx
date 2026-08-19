"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { SignedOutBanner } from "@/components/auth/signed-out-banner";
import { useAuthSession } from "@/components/auth/use-auth-session";
import { MealCard } from "@/components/meals/meal-card";
import { SwapSheet } from "@/components/meals/swap-sheet";
import { Disclaimer } from "@/components/shell/copy";
import { LoadedBar } from "@/components/shell/loaded-bar";
import { PrintoutStrip } from "@/components/shell/printout-strip";
import { buttonVariants } from "@/components/ui/button";
import { CATALOG_RECIPES, catalogSeeded } from "@/catalog/recipes";
import { cn } from "@/lib/utils";
import {
  getProfile,
  listDayPlans,
  listMealSlotsForDay,
  listPlanVersions,
  pinMealSlot,
  setMealEaten,
  swapMealSlot,
  type MealSlotRow,
  type PlanVersion,
  type Profile,
} from "@/data";
import {
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

export function TodayScreen() {
  const { status } = useAuthSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [version, setVersion] = useState<PlanVersion | null>(null);
  const [meals, setMeals] = useState<MealSlotRow[]>([]);
  const [swapSlot, setSwapSlot] = useState<MealSlot | null>(null);

  const fetchToday = useCallback(async () => {
    if (status !== "signed-in") {
      return { profile: null, version: null, meals: [] as MealSlotRow[] };
    }
    try {
      const [nextProfile, versions, days] = await Promise.all([
        getProfile(),
        listPlanVersions(),
        listDayPlans(),
      ]);
      const today = new Date().toISOString().slice(0, 10);
      const day = days.find((row) => row.onDate === today) ?? days[0];
      const nextMeals = day ? await listMealSlotsForDay(day.id) : [];
      return {
        profile: nextProfile,
        version: versions[0] ?? null,
        meals: nextMeals,
      };
    } catch {
      return { profile: null, version: null, meals: [] as MealSlotRow[] };
    }
  }, [status]);

  const applyToday = useCallback(
    (next: { profile: Profile | null; version: PlanVersion | null; meals: MealSlotRow[] }) => {
      setProfile(next.profile);
      setVersion(next.version);
      setMeals(next.meals);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      void (async () => {
        const next = await fetchToday();
        if (cancelled) return;
        applyToday(next);
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [fetchToday, applyToday]);

  const shownProfile = status === "signed-in" ? profile : null;
  const shownVersion = status === "signed-in" ? version : null;
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
      <LoadedBar
        eaten={eaten}
        onToggle={
          canAct
            ? (slot) => {
                const row = rowFor(slot);
                if (!row) return;
                void setMealEaten(row.id, !row.eaten).then(() =>
                  fetchToday().then(applyToday),
                );
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
          return (
            <MealCard
              key={slot}
              slot={slot}
              title={
                recipe?.title ??
                (hasPlan ? row?.recipeSlug.replace(/-/g, " ") ?? "After generate" : "After generate")
              }
              kcal={recipe?.nutrition.kcal ?? null}
              proteinG={recipe?.nutrition.proteinG ?? null}
              eaten={row?.eaten ?? false}
              pinned={row?.pinned ?? false}
              canSwap={Boolean(catalogSeeded && row && canAct)}
              canAct={Boolean(row && canAct)}
              onSwap={() => setSwapSlot(slot)}
              onAte={() => {
                if (!row) return;
                void setMealEaten(row.id, !row.eaten).then(() =>
                  fetchToday().then(applyToday),
                );
              }}
              onPin={() => {
                if (!row) return;
                void pinMealSlot(row.id, !row.pinned).then(() =>
                  fetchToday().then(applyToday),
                );
              }}
            />
          );
        })}
      </section>
      <div className="h-7" aria-hidden />
      <Link href="/onboarding" className={cn(buttonVariants(), "mt-4 inline-flex")}>
        {hasPlan ? "Regenerate" : "Start onboarding"}
      </Link>
      <Disclaimer />
      <SwapSheet
        slot={swapSlot ?? "breakfast"}
        open={swapSlot != null}
        candidates={candidates}
        emptyReason="No USDA-checked swaps yet. Catalog is not done."
        onClose={() => setSwapSlot(null)}
        onPick={(slug) => {
          if (!swapping) return;
          void swapMealSlot(swapping.id, slug).then(() => {
            setSwapSlot(null);
            return fetchToday().then(applyToday);
          });
        }}
      />
    </main>
  );
}
