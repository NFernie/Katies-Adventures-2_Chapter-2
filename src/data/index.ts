export {
  sendMagicLink,
  getSession,
  signOut,
  lockRedirectUrl,
  onboardingRedirectUrl,
  subscribeToSession,
  completeAuthFromUrl,
  MAGIC_LINK_SENT_KEY,
} from "./auth";
export { isSupabaseConfigured } from "./client";
export { GatewayError, SignedOutError } from "./errors";
export { DEFAULT_OWNER_ID, getOwnerId } from "./owner";
export { getProfile, upsertProfile } from "./profiles";
export {
  commitPlanVersion,
  listPlanVersions,
  listDayPlans,
  listCurrentDayPlans,
} from "./plans";
export { listCheckIns, upsertCheckIn, deleteCheckIn } from "./check-ins";
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
export type { CheckIn, CheckInWrite } from "./check-ins";
export type {
  WorkoutItemRow,
  WorkoutSessionRow,
  WorkoutSetRow,
  WorkoutSets,
} from "./workouts";
