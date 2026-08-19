import { createBrowserClient } from "./client";
import { GatewayError } from "./errors";
import type { GatewayClient } from "./gateway-client";
import { getOwnerId } from "./owner";
import type { Profile, ProfileWrite } from "./types";

type ProfileRow = {
  id: string;
  owner_id: string;
  sex: "male" | "female";
  birth_date: string;
  height_cm: number;
  weight_kg: number;
  body_fat_pct: number;
  skeletal_muscle_mass_kg: number;
  body_fat_mass_kg: number | null;
  visceral_fat_level: number | null;
  visceral_fat_scale: "inbody_level" | "tanita_rating" | null;
  total_body_water_kg: number | null;
  diet_flags: string[];
  kitchen_flags: string[];
  servings: number;
};

function asClient(client?: GatewayClient): GatewayClient {
  return client ?? (createBrowserClient() as unknown as GatewayClient);
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    ownerId: row.owner_id,
    sex: row.sex,
    birthDate: row.birth_date,
    heightCm: Number(row.height_cm),
    weightKg: Number(row.weight_kg),
    bodyFatPct: Number(row.body_fat_pct),
    skeletalMuscleMassKg: Number(row.skeletal_muscle_mass_kg),
    bodyFatMassKg:
      row.body_fat_mass_kg == null ? null : Number(row.body_fat_mass_kg),
    visceralFatLevel:
      row.visceral_fat_level == null ? null : Number(row.visceral_fat_level),
    visceralFatScale: row.visceral_fat_scale,
    totalBodyWaterKg:
      row.total_body_water_kg == null ? null : Number(row.total_body_water_kg),
    dietFlags: row.diet_flags,
    kitchenFlags: row.kitchen_flags,
    servings: row.servings,
  };
}

function toRow(input: ProfileWrite, ownerId: string) {
  return {
    owner_id: ownerId,
    sex: input.sex,
    birth_date: input.birthDate,
    height_cm: input.heightCm,
    weight_kg: input.weightKg,
    body_fat_pct: input.bodyFatPct,
    skeletal_muscle_mass_kg: input.skeletalMuscleMassKg,
    body_fat_mass_kg: input.bodyFatMassKg ?? null,
    visceral_fat_level: input.visceralFatLevel ?? null,
    visceral_fat_scale: input.visceralFatScale ?? null,
    total_body_water_kg: input.totalBodyWaterKg ?? null,
    diet_flags: input.dietFlags ?? [],
    kitchen_flags: input.kitchenFlags ?? [],
    servings: input.servings ?? 1,
    updated_at: new Date().toISOString(),
  };
}

export async function getProfile(
  client?: GatewayClient,
): Promise<Profile | null> {
  const db = asClient(client);
  const ownerId = await getOwnerId(db);
  const { data, error } = await db
    .from("profiles")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) throw new GatewayError(error.message);
  if (!data) return null;
  return mapProfile(data as ProfileRow);
}

export async function upsertProfile(
  input: ProfileWrite,
  client?: GatewayClient,
): Promise<Profile | null> {
  const db = asClient(client);
  const ownerId = await getOwnerId(db);
  const row = toRow(input, ownerId);
  const { data, error } = await db
    .from("profiles")
    .upsert(row, { onConflict: "owner_id" })
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) throw new GatewayError(error.message);
  if (!data) return null;
  return mapProfile(data as ProfileRow);
}
