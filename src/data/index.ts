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
export {
  completeWorkoutItem,
  listWorkoutItems,
  listWorkoutSessionForDay,
  saveWorkoutSets,
  skipWorkoutItem,
  swapWorkoutItem,
  emptySets,
  isSkippedSets,
} from "./workouts";
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
export type {
  WorkoutItemRow,
  WorkoutSessionRow,
  WorkoutSetRow,
  WorkoutSets,
} from "./workouts";
