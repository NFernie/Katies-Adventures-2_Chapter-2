import { SignedOutError } from "./errors";
import type { SessionReader } from "./gateway-client";

/**
 * Test/fixture UUID only. Production writes use session.user.id via getOwnerId().
 * Never bake this into RLS or insert it as a stand-in owner.
 */
export const DEFAULT_OWNER_ID =
  "198e5a49-c748-4bcc-b6ad-86445a76eb7b" as const;

/**
 * Returns the magic-link session user id, or throws. Does not return
 * DEFAULT_OWNER_ID — that constant is test/fixture only.
 */
export async function getOwnerId(client: SessionReader): Promise<string> {
  const { data } = await client.auth.getSession();
  const id = data.session?.user?.id;
  if (!id) {
    throw new SignedOutError();
  }
  return id;
}
