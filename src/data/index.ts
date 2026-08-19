export {
  sendMagicLink,
  getSession,
  signOut,
  lockRedirectUrl,
  onboardingRedirectUrl,
  subscribeToSession,
} from "./auth";
export { isSupabaseConfigured } from "./client";
export { GatewayError, SignedOutError } from "./errors";
export { DEFAULT_OWNER_ID, getOwnerId } from "./owner";
export { getProfile, upsertProfile } from "./profiles";
export { commitPlanVersion, listPlanVersions, listDayPlans } from "./plans";
export {
  listMealSlotsForDay,
  swapMealSlot,
  pinMealSlot,
  setMealEaten,
} from "./meals";
export { listTrainingDays, replaceTrainingDays } from "./training-days";
export type {
  GoalType,
  GoalWrite,
  PlanVersion,
  Profile,
  ProfileWrite,
  TrainingDay,
  TrainingDayWrite,
  Weekday,
  TrainingSetting,
  Sex,
} from "./types";
export type { Session } from "./gateway-client";
export type { MealSlotRow } from "./meals";
export type { DayPlan } from "./plans";
