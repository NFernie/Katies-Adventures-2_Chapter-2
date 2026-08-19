export type Sex = "male" | "female";

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type TrainingSetting = "gym" | "home" | "bands" | "bodyweight";

export type VisceralFatScale = "inbody_level" | "tanita_rating";

export type Profile = {
  id: string;
  ownerId: string;
  sex: Sex;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  bodyFatPct: number;
  skeletalMuscleMassKg: number;
  bodyFatMassKg: number | null;
  visceralFatLevel: number | null;
  visceralFatScale: VisceralFatScale | null;
  totalBodyWaterKg: number | null;
  dietFlags: string[];
  kitchenFlags: string[];
  servings: number;
};

export type ProfileWrite = {
  sex: Sex;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  bodyFatPct: number;
  skeletalMuscleMassKg: number;
  bodyFatMassKg?: number | null;
  visceralFatLevel?: number | null;
  visceralFatScale?: VisceralFatScale | null;
  totalBodyWaterKg?: number | null;
  dietFlags?: string[];
  kitchenFlags?: string[];
  servings?: number;
};

export type TrainingDay = {
  id: string;
  ownerId: string;
  weekday: Weekday;
  setting: TrainingSetting;
};

export type TrainingDayWrite = {
  weekday: Weekday;
  setting: TrainingSetting;
};

export type GoalType =
  | "fat_loss"
  | "fat_loss_retain_muscle"
  | "recomp"
  | "maintain";

export type GoalWrite = {
  type: GoalType;
  startOn: string;
  endOn: string;
  targetWeightKg: number | null;
  weeklyLossCapPct: number;
};

export type PlanVersion = {
  id: string;
  ownerId: string;
  planId: string;
  versionN: number;
  bmrKcal: number;
  pal: number;
  tdeeKcal: number;
  energyKcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  splitId: string;
  cardio: { kind: string; sessionsPerWeek: number };
  warnings: string[];
};
