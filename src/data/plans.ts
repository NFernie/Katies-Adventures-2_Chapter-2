import { CATALOG_EXERCISES } from "../catalog/exercises";
import { CATALOG_RECIPES } from "../catalog/recipes";
import { assignDayMeals, MEAL_SLOTS, type MealSlot } from "../engine/meals";
import { WEEKDAYS } from "../engine/plan-energy-and-training";
import { assignSession } from "../engine/training";
import type {
  DaySetting,
  DietFlag,
  EngineSuccess,
  KitchenFlag,
  SplitId,
  Weekday as EngineWeekday,
} from "../engine/types";
import type { Json } from "./database.types";
import { createBrowserClient } from "./client";
import { GatewayError } from "./errors";
import type { GatewayClient } from "./gateway-client";
import { listMealSlotsForDay } from "./meals";
import { getOwnerId } from "./owner";
import { upsertProfile } from "./profiles";
import { replaceTrainingDays } from "./training-days";
import type {
  GoalWrite,
  PlanVersion,
  ProfileWrite,
  TrainingDayWrite,
  TrainingSetting,
  Weekday,
} from "./types";
import { emptySets } from "./workouts";

function addUtcDays(iso: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new Error(`Invalid date ${iso}`);
  const stamp = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]) + days,
  );
  return new Date(stamp).toISOString().slice(0, 10);
}

function asClient(client?: GatewayClient): GatewayClient {
  return client ?? (createBrowserClient() as unknown as GatewayClient);
}

function weekdayOf(iso: string): Weekday {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new Error(`Invalid date ${iso}`);
  const js = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  ).getUTCDay();
  const map: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return map[js] ?? "mon";
}

function trainingWeekFrom(result: EngineSuccess): Record<EngineWeekday, DaySetting> {
  const week = Object.fromEntries(WEEKDAYS.map((day) => [day, "rest"])) as Record<
    EngineWeekday,
    DaySetting
  >;
  WEEKDAYS.forEach((day, index) => {
    week[day] = result.trainDaySettings[index] ?? "rest";
  });
  return week;
}

function persistSetting(setting: DaySetting): TrainingSetting {
  return setting === "rest" ? "home" : setting;
}

function isDeloadOn(startOn: string, onDate: string, deloadWeeks: number[]): boolean {
  const start = Date.parse(`${startOn}T00:00:00Z`);
  const on = Date.parse(`${onDate}T00:00:00Z`);
  const days = Math.round((on - start) / 86_400_000);
  const week = Math.floor(days / 7) + 1;
  return deloadWeeks.includes(week);
}

async function throwIfError(
  error: { message: string } | null,
): Promise<void> {
  if (error) throw new GatewayError(error.message);
}

export type CommitPlanInput = {
  profile: ProfileWrite;
  trainingDays: TrainingDayWrite[];
  goal: GoalWrite;
  result: EngineSuccess;
  generatorInput: Json;
  keepPins?: boolean;
};

export async function commitPlanVersion(
  input: CommitPlanInput,
  client?: GatewayClient,
): Promise<{ planVersionId: string; planId: string; goalId: string }> {
  const db = asClient(client);
  const ownerId = await getOwnerId(db);

  await upsertProfile(input.profile, db);
  await replaceTrainingDays(input.trainingDays, db);

  const existing = await listPlanVersions(db);
  const latest = existing[0] ?? null;
  const keepPins = input.keepPins !== false;
  const pinned: Partial<Record<MealSlot, string>> = {};
  if (keepPins && latest) {
    const days = (await listDayPlans(db))
      .filter((day) => day.planVersionId === latest.id)
      .sort((a, b) => (a.onDate < b.onDate ? -1 : 1));
    for (const day of days) {
      const meals = await listMealSlotsForDay(day.id, db);
      for (const meal of meals) {
        if (meal.pinned) pinned[meal.slot] = meal.recipeSlug;
      }
    }
  }

  const goalId = crypto.randomUUID();
  const planId = latest?.planId ?? crypto.randomUUID();
  const planVersionId = crypto.randomUUID();
  const versionN = latest ? latest.versionN + 1 : 1;

  const { error: goalError } = await db.from("goals").insert({
    id: goalId,
    owner_id: ownerId,
    type: input.goal.type,
    target_weight_kg: input.goal.targetWeightKg,
    start_on: input.goal.startOn,
    end_on: input.goal.endOn,
    weekly_loss_cap_pct: input.goal.weeklyLossCapPct,
  });
  await throwIfError(goalError);

  if (!latest) {
    const { error: planError } = await db.from("plans").insert({
      id: planId,
      owner_id: ownerId,
      goal_id: goalId,
      status: "active",
    });
    await throwIfError(planError);
  }

  const { error: versionError } = await db.from("plan_versions").insert({
    id: planVersionId,
    owner_id: ownerId,
    plan_id: planId,
    version_n: versionN,
    bmr_kcal: input.result.bmrKcal,
    pal: input.result.pal,
    tdee_kcal: input.result.tdeeKcal,
    energy_kcal: input.result.energyKcal,
    protein_g: input.result.proteinG,
    carb_g: input.result.carbG,
    fat_g: input.result.fatG,
    split_id: input.result.splitId,
    cardio: input.result.cardio,
    warnings: input.result.warnings,
    generator_input: input.generatorInput,
  });
  await throwIfError(versionError);

  const assigned = assignDayMeals({
    energyKcal: input.result.energyKcal,
    proteinG: input.result.proteinG,
    recipes: CATALOG_RECIPES,
    dietFlags: (input.profile.dietFlags ?? []) as DietFlag[],
    kitchenFlags: (input.profile.kitchenFlags ?? []) as KitchenFlag[],
    pinned,
  });

  const trainingWeek = trainingWeekFrom(input.result);

  for (let offset = 0; offset < 3; offset += 1) {
    const onDate = addUtcDays(input.goal.startOn, offset);
    const weekday = weekdayOf(onDate);
    const daySetting = trainingWeek[weekday];
    const isTrainDay = daySetting !== "rest";
    const isDeload = isDeloadOn(
      input.goal.startOn,
      onDate,
      input.result.deloadWeeks,
    );
    const dayPlanId = crypto.randomUUID();
    const { error: dayError } = await db.from("day_plans").insert({
      id: dayPlanId,
      owner_id: ownerId,
      plan_version_id: planVersionId,
      on_date: onDate,
      is_train_day: isTrainDay,
      training_setting: isTrainDay ? persistSetting(daySetting) : null,
      is_deload: isDeload,
    });
    await throwIfError(dayError);

    const meals = MEAL_SLOTS.map((slot) => ({
      id: crypto.randomUUID(),
      owner_id: ownerId,
      day_plan_id: dayPlanId,
      slot,
      recipe_slug: assigned.slots[slot]?.slug ?? `empty-${slot}`,
      pinned: Boolean(pinned[slot]),
      eaten: false,
    }));
    const { error: mealError } = await db.from("meal_slots").insert(meals);
    await throwIfError(mealError);

    const session = assignSession({
      weekday,
      trainingWeek,
      splitId: input.result.splitId as SplitId,
      cardio: input.result.cardio,
      catalog: CATALOG_EXERCISES,
      deload: isDeload,
    });
    if (session.items.length === 0) continue;

    const workoutSessionId = crypto.randomUUID();
    const { error: sessionError } = await db.from("workout_sessions").insert({
      id: workoutSessionId,
      owner_id: ownerId,
      day_plan_id: dayPlanId,
      focus: session.focus,
      setting: persistSetting(session.setting),
      cardio: session.withCardio
        ? { kind: input.result.cardio.kind }
        : {},
    });
    await throwIfError(sessionError);

    const items = session.items.map((item, orderIndex) => ({
      id: crypto.randomUUID(),
      owner_id: ownerId,
      workout_session_id: workoutSessionId,
      exercise_slug: item.slug,
      order_index: orderIndex,
      sets: emptySets(item.plannedSets),
      completed: false,
    }));
    const { error: itemError } = await db.from("workout_items").insert(items);
    await throwIfError(itemError);
  }

  return { planVersionId, planId, goalId };
}

type PlanVersionRow = {
  id: string;
  owner_id: string;
  plan_id: string;
  version_n: number;
  bmr_kcal: number;
  pal: number;
  tdee_kcal: number;
  energy_kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  split_id: string;
  cardio: PlanVersion["cardio"];
  warnings: string[];
  generator_input: Json;
};

function mapVersion(row: PlanVersionRow): PlanVersion {
  return {
    id: row.id,
    ownerId: row.owner_id,
    planId: row.plan_id,
    versionN: row.version_n,
    bmrKcal: Number(row.bmr_kcal),
    pal: Number(row.pal),
    tdeeKcal: Number(row.tdee_kcal),
    energyKcal: Number(row.energy_kcal),
    proteinG: Number(row.protein_g),
    carbG: Number(row.carb_g),
    fatG: Number(row.fat_g),
    splitId: row.split_id,
    cardio: row.cardio,
    warnings: row.warnings,
    generatorInput: row.generator_input,
  };
}

export async function listPlanVersions(
  client?: GatewayClient,
): Promise<PlanVersion[]> {
  const db = asClient(client);
  const ownerId = await getOwnerId(db);
  const { data, error } = await db
    .from("plan_versions")
    .select("*")
    .eq("owner_id", ownerId);
  if (error) throw new GatewayError(error.message);
  const rows = (Array.isArray(data) ? data : data ? [data] : []) as PlanVersionRow[];
  return rows
    .map(mapVersion)
    .sort((a, b) => b.versionN - a.versionN);
}

export type DayPlan = {
  id: string;
  ownerId: string;
  planVersionId: string;
  onDate: string;
  isTrainDay: boolean;
  trainingSetting: TrainingSetting | null;
  isDeload: boolean;
};

export async function listDayPlans(
  client?: GatewayClient,
): Promise<DayPlan[]> {
  const db = asClient(client);
  const ownerId = await getOwnerId(db);
  const { data, error } = await db
    .from("day_plans")
    .select("*")
    .eq("owner_id", ownerId);
  if (error) throw new GatewayError(error.message);
  const rows = (Array.isArray(data) ? data : data ? [data] : []) as Array<{
    id: string;
    owner_id: string;
    plan_version_id: string;
    on_date: string;
    is_train_day: boolean;
    training_setting: TrainingSetting | null;
    is_deload: boolean;
  }>;
  return rows
    .map((row) => ({
      id: row.id,
      ownerId: row.owner_id,
      planVersionId: row.plan_version_id,
      onDate: row.on_date,
      isTrainDay: row.is_train_day,
      trainingSetting: row.training_setting,
      isDeload: row.is_deload,
    }))
    .sort((a, b) => (a.onDate < b.onDate ? 1 : -1));
}

/** Current plan only — older versions stay readable via listDayPlans but are not the live week. */
export async function listCurrentDayPlans(
  client?: GatewayClient,
): Promise<DayPlan[]> {
  const versions = await listPlanVersions(client);
  const latestId = versions[0]?.id;
  const days = await listDayPlans(client);
  if (!latestId) return days;
  return days.filter((day) => day.planVersionId === latestId);
}
