import { createBrowserClient } from "./client";
import { GatewayError } from "./errors";
import type { GatewayClient } from "./gateway-client";
import { getOwnerId } from "./owner";
import type { TrainingDay, TrainingDayWrite } from "./types";

type TrainingDayRow = {
  id: string;
  owner_id: string;
  weekday: TrainingDay["weekday"];
  setting: TrainingDay["setting"];
};

function asClient(client?: GatewayClient): GatewayClient {
  return client ?? (createBrowserClient() as unknown as GatewayClient);
}

function mapDay(row: TrainingDayRow): TrainingDay {
  return {
    id: row.id,
    ownerId: row.owner_id,
    weekday: row.weekday,
    setting: row.setting,
  };
}

export async function listTrainingDays(
  client?: GatewayClient,
): Promise<TrainingDay[]> {
  const db = asClient(client);
  const ownerId = await getOwnerId(db);
  const { data, error } = await db
    .from("training_days")
    .select("*")
    .eq("owner_id", ownerId);

  if (error) throw new GatewayError(error.message);
  return ((data as TrainingDayRow[] | null) ?? []).map(mapDay);
}

export async function replaceTrainingDays(
  days: TrainingDayWrite[],
  client?: GatewayClient,
): Promise<void> {
  const db = asClient(client);
  const ownerId = await getOwnerId(db);

  const { error: deleteError } = await db
    .from("training_days")
    .delete()
    .eq("owner_id", ownerId);

  if (deleteError) throw new GatewayError(deleteError.message);
  if (days.length === 0) return;

  const rows = days.map((day) => ({
    owner_id: ownerId,
    weekday: day.weekday,
    setting: day.setting,
  }));

  const { error: insertError } = await db.from("training_days").insert(rows);
  if (insertError) throw new GatewayError(insertError.message);
}
