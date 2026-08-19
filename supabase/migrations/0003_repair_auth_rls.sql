-- Repair a project that applied the pre-revision-5 SQL (gym_days_per_week,
-- no training_days, possibly an open anon policy).
-- Safe to re-run. Paste in SQL Editor when 0001_init.sql fails because
-- tables already exist. Do not apply from the website. No secrets in this file.

do $$ begin
  create type public.weekday as enum (
    'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.training_setting as enum (
    'gym', 'home', 'bands', 'bodyweight'
  );
exception when duplicate_object then null;
end $$;

grant usage on type public.weekday to authenticated;
grant usage on type public.training_setting to authenticated;

alter table public.profiles drop column if exists gym_days_per_week;

create table if not exists public.training_days (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  weekday public.weekday not null,
  setting public.training_setting not null,
  unique (owner_id, weekday)
);

create index if not exists training_days_owner_id_idx
  on public.training_days (owner_id);

-- Drop every existing policy on personal tables that exist
-- (including is_v1_owner / open anon policies).
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles',
        'training_days',
        'goals',
        'plans',
        'plan_versions',
        'day_plans',
        'meal_slots',
        'workout_sessions',
        'workout_items',
        'check_ins',
        'favorites'
      )
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Auth-scoped RLS. No is_v1_owner. No open anon policy.
-- Skip names that are not in this project yet.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles',
    'training_days',
    'goals',
    'plans',
    'plan_versions',
    'day_plans',
    'meal_slots',
    'workout_sessions',
    'workout_items',
    'check_ins',
    'favorites'
  ]
  loop
    if to_regclass(format('public.%I', t)) is null then
      continue;
    end if;
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, public', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())',
      t || '_auth_owner',
      t
    );
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end
$$;
