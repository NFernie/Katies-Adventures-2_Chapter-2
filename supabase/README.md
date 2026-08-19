# Proposed initial schema (do not apply without credentials)

This file is a **proposal**. Phase 4 applies it to a real Supabase project after the Owner has URL + anon key. Applying it here would need those credentials; they are not in this repo.

```
-- v1 RLS: anon + authenticated may touch rows where
--   owner_id = '198e5a49-c748-4bcc-b6ad-86445a76eb7b'  -- DEFAULT_OWNER_ID
-- Phase 4b RLS: drop v1 policies; use owner_id = auth.uid() for authenticated;
--   revoke anon. Do not add references auth.users in this migration.
```

See `0001_init.sql` in this folder for the full SQL.
