import type { EngineSuccess } from "../engine/types";
import type { Json } from "./database.types";
import { createBrowserClient } from "./client";
import { GatewayError } from "./errors";
import type { GatewayClient } from "./gateway-client";
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

const DUMMY_MEALS = [
  { slot: "breakfast" as const, slug: "dummy-breakfast" },
  { slot: "lunch" as const, slug: "dummy-lunch" },
  { slot: "dinner" as const, slug: "dummy-dinner" },
  { slot: "snack" as const, slug: "dummy-snack" },
];

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
};

export async function commitPlanVersion(
  input: CommitPlanInput,
  client?: GatewayClient,
): Promise<{ planVersionId: string; planId: string; goalId: string }> {
  const db = asClient(client);
  const ownerId = await getOwnerId(db);

  await upsertProfile(input.profile, db);
  await replaceTrainingDays(input.trainingDays, db);

  const goalId = crypto.randomUUID();
  const planId = crypto.randomUUID();
  const planVersionId = crypto.randomUUID();
  const dayPlanId = crypto.randomUUID();

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

  const { error: planError } = await db.from("plans").insert({
    id: planId,
    owner_id: ownerId,
    goal_id: goalId,
    status: "active",
  });
  await throwIfError(planError);

  const { error: versionError } = await db.from("plan_versions").insert({
    id: planVersionId,
    owner_id: ownerId,
    plan_id: planId,
    version_n: 1,
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

  const startWeekday = weekdayOf(input.goal.startOn);
  const trainSetting = input.trainingDays.find((day) => day.weekday === startWeekday)
    ?.setting;
  const isTrainDay = Boolean(trainSetting);

  const { error: dayError } = await db.from("day_plans").insert({
    id: dayPlanId,
    owner_id: ownerId,
    plan_version_id: planVersionId,
    on_date: input.goal.startOn,
    is_train_day: isTrainDay,
    training_setting: isTrainDay ? (trainSetting as TrainingSetting) : null,
    is_deload: false,
  });
  await throwIfError(dayError);

  const meals = DUMMY_MEALS.map((meal) => ({
    id: crypto.randomUUID(),
    owner_id: ownerId,
    day_plan_id: dayPlanId,
    slot: meal.slot,
    recipe_slug: meal.slug,
    pinned: false,
    eaten: false,
  }));
  const { error: mealError } = await db.from("meal_slots").insert(meals);
  await throwIfError(mealError);

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
  }>;
  return rows
    .map((row) => ({
      id: row.id,
      ownerId: row.owner_id,
      planVersionId: row.plan_version_id,
      onDate: row.on_date,
      isTrainDay: row.is_train_day,
    }))
    .sort((a, b) => (a.onDate < b.onDate ? 1 : -1));
}
