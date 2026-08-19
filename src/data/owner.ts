/** Test/fixture UUID only. Production writes use auth.uid() (Phase 4). */
export const DEFAULT_OWNER_ID =
  "198e5a49-c748-4bcc-b6ad-86445a76eb7b" as const;

/** Scaffold stand-in until Phase 4. Production must read the magic-link session. */
export function getOwnerId(): string {
  return DEFAULT_OWNER_ID;
}
