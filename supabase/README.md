# Proposed initial schema (do not apply without credentials)

This file is a **proposal**. Phase 4 applies it to a real Supabase project after the Owner has URL + anon key **and** Email (magic link) enabled. Applying it here would need those credentials; they are not in this repo.

```
-- RLS: authenticated may touch rows where owner_id = auth.uid()
-- REVOKE ALL FROM anon on personal tables (including training_days)
-- DEFAULT_OWNER_ID is test/fixture only — not a production policy
```

See `0001_init.sql` in this folder for the full SQL. Auth ADR: `docs/decisions/0004-auth-at-persistence.md`. Mixed week: `docs/decisions/0003-mixed-training-week.md`.
