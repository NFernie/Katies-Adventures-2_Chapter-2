import type { PlanVersion } from "@/data";

export function goalFromVersion(version: PlanVersion | null) {
  const snapshot = version?.generatorInput as
    | {
        goal?: {
          startOn?: string;
          endOn?: string;
          targetWeightKg?: number | null;
          weeklyLossCapPct?: number;
        };
      }
    | undefined;
  return {
    startOn: snapshot?.goal?.startOn ?? "",
    endOn: snapshot?.goal?.endOn ?? "",
    targetWeightKg: snapshot?.goal?.targetWeightKg ?? null,
    weeklyLossCapPct: snapshot?.goal?.weeklyLossCapPct ?? 1,
  };
}
