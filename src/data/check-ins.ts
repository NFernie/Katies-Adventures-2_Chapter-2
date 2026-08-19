import { createBrowserClient } from "./client";
import { GatewayError } from "./errors";
import type { GatewayClient } from "./gateway-client";
import { getOwnerId } from "./owner";
import type { VisceralFatScale } from "./types";

function asClient(client?: GatewayClient): GatewayClient {
  return client ?? (createBrowserClient() as unknown as GatewayClient);
}

async function throwIfError(error: { message: string } | null): Promise<void> {
  if (error) throw new GatewayError(error.message);
}

export type CheckIn = {
  id: string;
  ownerId: string;
  loggedOn: string;
  weightKg: number;
  bodyFatPct: number;
  skeletalMuscleMassKg: number;
  bodyFatMassKg: number | null;
  visceralFatLevel: number | null;
  visceralFatScale: VisceralFatScale | null;
  totalBodyWaterKg: number | null;
};

export type CheckInWrite = {
  loggedOn: string;
  weightKg: number;
  bodyFatPct: number;
  skeletalMuscleMassKg: number;
  bodyFatMassKg?: number | null;
  visceralFatLevel?: number | null;
  visceralFatScale?: VisceralFatScale | null;
  totalBodyWaterKg?: number | null;
};

type CheckInDb = {
  id: string;
  owner_id: string;
  logged_on: string;
  weight_kg: number;
  body_fat_pct: number;
  skeletal_muscle_mass_kg: number;
  body_fat_mass_kg: number | null;
  visceral_fat_level: number | null;
  visceral_fat_scale: VisceralFatScale | null;
  total_body_water_kg: number | null;
};

function mapCheckIn(row: CheckInDb): CheckIn {
  return {
    id: row.id,
    ownerId: row.owner_id,
    loggedOn: row.logged_on,
    weightKg: Number(row.weight_kg),
    bodyFatPct: Number(row.body_fat_pct),
    skeletalMuscleMassKg: Number(row.skeletal_muscle_mass_kg),
    bodyFatMassKg: row.body_fat_mass_kg == null ? null : Number(row.body_fat_mass_kg),
    visceralFatLevel:
      row.visceral_fat_level == null ? null : Number(row.visceral_fat_level),
    visceralFatScale: row.visceral_fat_scale,
    totalBodyWaterKg:
      row.total_body_water_kg == null ? null : Number(row.total_body_water_kg),
  };
}

export async function listCheckIns(client?: GatewayClient): Promise<CheckIn[]> {
  const db = asClient(client);
  const ownerId = await getOwnerId(db);
  const { data, error } = await db
    .from("check_ins")
    .select("*")
    .eq("owner_id", ownerId);
  if (error) throw new GatewayError(error.message);
  const rows = (Array.isArray(data) ? data : data ? [data] : []) as CheckInDb[];
  return rows
    .map(mapCheckIn)
    .sort((a, b) => (a.loggedOn < b.loggedOn ? 1 : -1));
}

export async function upsertCheckIn(
  input: CheckInWrite,
  client?: GatewayClient,
): Promise<void> {
  const db = asClient(client);
  const ownerId = await getOwnerId(db);
  const { error } = await db.from("check_ins").upsert(
    {
      owner_id: ownerId,
      logged_on: input.loggedOn,
      weight_kg: input.weightKg,
      body_fat_pct: input.bodyFatPct,
      skeletal_muscle_mass_kg: input.skeletalMuscleMassKg,
      body_fat_mass_kg: input.bodyFatMassKg ?? null,
      visceral_fat_level: input.visceralFatLevel ?? null,
      visceral_fat_scale: input.visceralFatScale ?? null,
      total_body_water_kg: input.totalBodyWaterKg ?? null,
    },
    { onConflict: "owner_id,logged_on" },
  );
  await throwIfError(error);
}

export async function deleteCheckIn(
  id: string,
  client?: GatewayClient,
): Promise<void> {
  const db = asClient(client);
  const ownerId = await getOwnerId(db);
  const { error } = await db
    .from("check_ins")
    .delete()
    .eq("id", id)
    .eq("owner_id", ownerId);
  await throwIfError(error);
}
