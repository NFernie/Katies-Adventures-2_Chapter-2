export {
  sendMagicLink,
  getSession,
  signOut,
  lockRedirectUrl,
  subscribeToSession,
} from "./auth";
export { isSupabaseConfigured } from "./client";
export { GatewayError, SignedOutError } from "./errors";
export { DEFAULT_OWNER_ID, getOwnerId } from "./owner";
export { getProfile, upsertProfile } from "./profiles";
export { listTrainingDays, replaceTrainingDays } from "./training-days";
export type {
  Profile,
  ProfileWrite,
  TrainingDay,
  TrainingDayWrite,
  Weekday,
  TrainingSetting,
  Sex,
} from "./types";
export type { Session } from "./gateway-client";
