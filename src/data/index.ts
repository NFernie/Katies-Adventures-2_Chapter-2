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
export { commitPlanVersion, listPlanVersions } from "./plans";
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
