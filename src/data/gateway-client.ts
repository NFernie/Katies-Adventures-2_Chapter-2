/**
 * Injectable seam for the data gateway. Production uses createBrowserClient().
 * Tests pass a recording fake. Screens never call .from() themselves.
 */
export type SessionUser = { id: string; email?: string | null };

export type Session = { user: SessionUser };

export type SessionReader = {
  auth: {
    getSession: () => Promise<{ data: { session: Session | null } }>;
  };
};

export type PersonalTable =
  | "profiles"
  | "training_days"
  | "goals"
  | "plans"
  | "plan_versions"
  | "day_plans"
  | "meal_slots"
  | "workout_sessions"
  | "workout_items"
  | "check_ins"
  | "favorites";

export type QueryResult<T> = Promise<{ data: T; error: { message: string } | null }>;

export type PersonalQuery<T = unknown> = {
  select: (columns?: string) => PersonalQuery<T>;
  insert: (row: unknown) => PersonalQuery<T>;
  upsert: (row: unknown, options?: { onConflict?: string }) => PersonalQuery<T>;
  update: (row: unknown) => PersonalQuery<T>;
  delete: () => PersonalQuery<T>;
  eq: (column: string, value: unknown) => PersonalQuery<T>;
  maybeSingle: () => QueryResult<T>;
  then: QueryResult<T>["then"];
};

export type GatewayClient = SessionReader & {
  from: (table: PersonalTable) => PersonalQuery;
};

export type AuthChangeUnsubscribe = {
  data?: { subscription?: { unsubscribe: () => void } };
};

export type AuthClient = SessionReader & {
  auth: SessionReader["auth"] & {
    signInWithOtp: (args: {
      email: string;
      options?: { emailRedirectTo?: string; shouldCreateUser?: boolean };
    }) => Promise<{ error: { message: string } | null }>;
    signInWithPassword: (args: {
      email: string;
      password: string;
    }) => Promise<{
      data: { session: Session | null };
      error: { message: string } | null;
    }>;
    signUp: (args: {
      email: string;
      password: string;
      options?: { emailRedirectTo?: string };
    }) => Promise<{
      data: { session: Session | null };
      error: { message: string } | null;
    }>;
    updateUser: (args: {
      password: string;
    }) => Promise<{ error: { message: string } | null }>;
    signOut: () => Promise<{ error: { message: string } | null }>;
    verifyOtp?: (args: {
      token_hash: string;
      type: string;
    }) => Promise<{ error: { message: string } | null }>;
    exchangeCodeForSession?: (
      code: string,
    ) => Promise<{ error: { message: string } | null }>;
    onAuthStateChange?: (
      listener: (event: string, session: Session | null) => void,
    ) => AuthChangeUnsubscribe;
  };
};
