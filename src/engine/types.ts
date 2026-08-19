export type Sex = "male" | "female";
export type GoalType =
  | "fat_loss"
  | "fat_loss_retain_muscle"
  | "recomp"
  | "maintain";

export type DietFlag =
  | "vegetarian"
  | "vegan"
  | "allergy_nuts"
  | "allergy_dairy"
  | "allergy_gluten"
  | "allergy_shellfish"
  | "allergy_egg"
  | "allergy_soy"
  | "cook_under_30";

export type KitchenFlag =
  | "batch_cook"
  | "leftovers_as_lunch"
  | "eating_out_days";

export type SplitId =
  | "full_body"
  | "upper_lower"
  | "upper_lower_plus"
  | "ppl_twice"
  | "ppl_twice_plus";

export type CardioKind = "none" | "zone2" | "intervals";

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type TrainingSetting = "gym" | "home" | "bands" | "bodyweight";
export type DaySetting = TrainingSetting | "rest";

export interface EngineBody {
  sex: Sex;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  bodyFatPct: number;
  skeletalMuscleMassKg: number;
  bodyFatMassKg?: number | null;
  visceralFatLevel?: number | null;
  visceralFatScale?: "inbody_level" | "tanita_rating" | null;
  totalBodyWaterKg?: number | null;
}

export interface EngineGoal {
  type: GoalType;
  startOn: string;
  endOn: string;
  targetWeightKg: number | null;
  weeklyLossCapPct: number;
}

export interface EnginePrefs {
  trainingWeek: Record<Weekday, DaySetting>;
  dietFlags: DietFlag[];
  kitchenFlags: KitchenFlag[];
  servings: number;
}

export interface GeneratorBlock {
  code: "unsafe_loss_speed";
  impliedWeeklyLossPct: number;
  capPct: number;
  fastestSafeEndOn: string;
}

export interface EngineSuccess {
  ok: true;
  ageYears: number;
  bmrKcal: number;
  pal: number;
  tdeeKcal: number;
  impliedWeeklyLossPct: number;
  dailyDeficitKcal: number;
  energyKcal: number;
  proteinG: number;
  fatG: number;
  carbG: number;
  macroChecksumKcal: number;
  warnings: Array<"below_calorie_floor">;
  splitId: SplitId;
  trainingDaysPerWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  trainDaySettings: DaySetting[];
  cardio: { kind: CardioKind; sessionsPerWeek: number };
  deloadWeeks: number[];
}

export type EngineResult = EngineSuccess | { ok: false; block: GeneratorBlock };
