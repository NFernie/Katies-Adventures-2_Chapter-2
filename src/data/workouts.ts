import type { Json } from "./database.types";
import { createBrowserClient } from "./client";
import { GatewayError } from "./errors";
import type { GatewayClient } from "./gateway-client";
import { getOwnerId } from "./owner";
import type { TrainingSetting } from "./types";

function asClient(client?: GatewayClient): GatewayClient {
  return client ?? (createBrowserClient() as unknown as GatewayClient);
}

async function throwIfError(error: { message: string } | null): Promise<void> {
  if (error) throw new GatewayError(error.message);
}

export type WorkoutSetRow = {
  n: number;
  kg: number | null;
  reps: number | null;
  done: boolean;
};

export type WorkoutSets = { skipped: true } | WorkoutSetRow[];

export type WorkoutSessionRow = {
  id: string;
  ownerId: string;
  dayPlanId: string;
  focus: string;
  setting: TrainingSetting;
  cardio: Json;
};

export type WorkoutItemRow = {
  id: string;
  ownerId: string;
  workoutSessionId: string;
  exerciseSlug: string;
  orderIndex: number;
  sets: WorkoutSets;
  completed: boolean;
};

type SessionDb = {
  id: string;
  owner_id: string;
  day_plan_id: string;
  focus: string;
  setting: TrainingSetting;
  cardio: Json;
};

type ItemDb = {
  id: string;
  owner_id: string;
  workout_session_id: string;
  exercise_slug: string;
  order_index: number;
  sets: Json;
  completed: boolean;
};

export function emptySets(count: number): WorkoutSetRow[] {
  return Array.from({ length: Math.max(1, count) }, (_, index) => ({
    n: index + 1,
    kg: null,
    reps: null,
    done: false,
  }));
}

export function isSkippedSets(sets: WorkoutSets | Json): sets is { skipped: true } {
  return Boolean(
    sets &&
      typeof sets === "object" &&
      !Array.isArray(sets) &&
      (sets as { skipped?: boolean }).skipped === true,
  );
}

function mapSets(raw: Json): WorkoutSets {
  if (isSkippedSets(raw)) return { skipped: true };
  if (!Array.isArray(raw)) return [];
  return raw.map((row, index) => {
    const typed = (row ?? {}) as {
      n?: number;
      kg?: number | null;
      reps?: number | null;
      done?: boolean;
    };
    return {
      n: typed.n ?? index + 1,
      kg: typed.kg ?? null,
      reps: typed.reps ?? null,
      done: Boolean(typed.done),
    };
  });
}

function mapSession(row: SessionDb): WorkoutSessionRow {
  return {
    id: row.id,
    ownerId: row.owner_id,
    dayPlanId: row.day_plan_id,
    focus: row.focus,
    setting: row.setting,
    cardio: row.cardio,
  };
}

function mapItem(row: ItemDb): WorkoutItemRow {
  return {
    id: row.id,
    ownerId: row.owner_id,
    workoutSessionId: row.workout_session_id,
    exerciseSlug: row.exercise_slug,
    orderIndex: row.order_index,
    sets: mapSets(row.sets),
    completed: row.completed,
  };
}

export async function listWorkoutSessionForDay(
  dayPlanId: string,
  client?: GatewayClient,
): Promise<WorkoutSessionRow | null> {
  const db = asClient(client);
  const ownerId = await getOwnerId(db);
  const { data, error } = await db
    .from("workout_sessions")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("day_plan_id", dayPlanId)
    .maybeSingle();
  if (error) throw new GatewayError(error.message);
  if (!data) return null;
  return mapSession(data as SessionDb);
}

export async function listWorkoutItems(
  workoutSessionId: string,
  client?: GatewayClient,
): Promise<WorkoutItemRow[]> {
  const db = asClient(client);
  const ownerId = await getOwnerId(db);
  const { data, error } = await db
    .from("workout_items")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("workout_session_id", workoutSessionId);
  if (error) throw new GatewayError(error.message);
  const rows = (Array.isArray(data) ? data : data ? [data] : []) as ItemDb[];
  return rows
    .map(mapItem)
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

export async function swapWorkoutItem(
  id: string,
  exerciseSlug: string,
  client?: GatewayClient,
): Promise<void> {
  const db = asClient(client);
  const ownerId = await getOwnerId(db);
  const { error } = await db
    .from("workout_items")
    .update({ exercise_slug: exerciseSlug, completed: false })
    .eq("owner_id", ownerId)
    .eq("id", id);
  await throwIfError(error);
}

export async function completeWorkoutItem(
  id: string,
  client?: GatewayClient,
): Promise<void> {
  const db = asClient(client);
  const ownerId = await getOwnerId(db);
  const { error } = await db
    .from("workout_items")
    .update({ completed: true })
    .eq("owner_id", ownerId)
    .eq("id", id);
  await throwIfError(error);
}

export async function skipWorkoutItem(
  id: string,
  client?: GatewayClient,
): Promise<void> {
  const db = asClient(client);
  const ownerId = await getOwnerId(db);
  const { error } = await db
    .from("workout_items")
    .update({ completed: true, sets: { skipped: true } })
    .eq("owner_id", ownerId)
    .eq("id", id);
  await throwIfError(error);
}

export async function saveWorkoutSets(
  id: string,
  sets: WorkoutSetRow[],
  client?: GatewayClient,
): Promise<void> {
  const db = asClient(client);
  const ownerId = await getOwnerId(db);
  const { error } = await db
    .from("workout_items")
    .update({ sets })
    .eq("owner_id", ownerId)
    .eq("id", id);
  await throwIfError(error);
}
