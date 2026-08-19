# Schema + RLS (apply with the owner wizard)

SQL is ready. **Do not apply without a real Supabase project.** There are no credentials in this repo.

```
bash scripts/wizard-supabase-pages.sh
```

Click-by-click: `docs/wizard/supabase-pages.md`.

```
-- RLS: authenticated may touch rows where owner_id = auth.uid()
-- REVOKE ALL FROM anon on personal tables (including training_days)
-- DEFAULT_OWNER_ID is test/fixture only — not a production policy
-- No is_v1_owner open policy
```

1. `0001_init.sql` — tables + auth-scoped RLS.
2. `0002_owner_auth_fk.sql` — optional `owner_id` → `auth.users(id)`.

Auth ADR: `docs/decisions/0004-auth-at-persistence.md`. Mixed week: `docs/decisions/0003-mixed-training-week.md`.
