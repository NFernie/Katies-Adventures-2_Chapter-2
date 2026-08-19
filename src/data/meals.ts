import { createBrowserClient } from "./client";
import { GatewayError } from "./errors";
import type { GatewayClient } from "./gateway-client";
import { getOwnerId } from "./owner";

function asClient(client?: GatewayClient): GatewayClient {
  return client ?? (createBrowserClient() as unknown as GatewayClient);
}

async function throwIfError(error: { message: string } | null): Promise<void> {
  if (error) throw new GatewayError(error.message);
}

export type MealSlotRow = {
  id: string;
  ownerId: string;
  dayPlanId: string;
  slot: "breakfast" | "lunch" | "dinner" | "snack";
  recipeSlug: string;
  pinned: boolean;
  eaten: boolean;
};

type MealSlotDb = {
  id: string;
  owner_id: string;
  day_plan_id: string;
  slot: MealSlotRow["slot"];
  recipe_slug: string;
  pinned: boolean;
  eaten: boolean;
};

function mapSlot(row: MealSlotDb): MealSlotRow {
  return {
    id: row.id,
    ownerId: row.owner_id,
    dayPlanId: row.day_plan_id,
    slot: row.slot,
    recipeSlug: row.recipe_slug,
    pinned: row.pinned,
    eaten: row.eaten,
  };
}

export async function listMealSlotsForDay(
  dayPlanId: string,
  client?: GatewayClient,
): Promise<MealSlotRow[]> {
  const db = asClient(client);
  const ownerId = await getOwnerId(db);
  const { data, error } = await db
    .from("meal_slots")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("day_plan_id", dayPlanId);
  if (error) throw new GatewayError(error.message);
  const rows = (Array.isArray(data) ? data : data ? [data] : []) as MealSlotDb[];
  return rows.map(mapSlot);
}

export async function swapMealSlot(
  id: string,
  recipeSlug: string,
  client?: GatewayClient,
): Promise<void> {
  const db = asClient(client);
  const ownerId = await getOwnerId(db);
  const { error } = await db
    .from("meal_slots")
    .update({ recipe_slug: recipeSlug, pinned: false })
    .eq("owner_id", ownerId)
    .eq("id", id);
  await throwIfError(error);
}

export async function pinMealSlot(
  id: string,
  pinned: boolean,
  client?: GatewayClient,
): Promise<void> {
  const db = asClient(client);
  const ownerId = await getOwnerId(db);
  const { error } = await db
    .from("meal_slots")
    .update({ pinned })
    .eq("owner_id", ownerId)
    .eq("id", id);
  await throwIfError(error);
}

export async function setMealEaten(
  id: string,
  eaten: boolean,
  client?: GatewayClient,
): Promise<void> {
  const db = asClient(client);
  const ownerId = await getOwnerId(db);
  const { error } = await db
    .from("meal_slots")
    .update({ eaten })
    .eq("owner_id", ownerId)
    .eq("id", id);
  await throwIfError(error);
}
