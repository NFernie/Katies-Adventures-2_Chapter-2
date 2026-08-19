-- BodyPlan v1 schema proposal (Phase 2).
-- DO NOT APPLY without Owner credentials (Phase 4). No secrets in this repo.
--
-- DEFAULT_OWNER_ID (locked): 198e5a49-c748-4bcc-b6ad-86445a76eb7b
-- Catalog (recipes/exercises) is git JSON — do not create catalog tables here.
-- No NextAuth tables. No auth.users FK in v1. No photo columns.
--
-- ---------------------------------------------------------------------------
-- RLS: v1 vs Phase 4b
-- ---------------------------------------------------------------------------
-- v1 (this file): enable RLS on every personal table. Policies for roles
--   `anon` AND `authenticated` allow ALL when owner_id = DEFAULT_OWNER_ID.
--   Anyone who finds the Pages URL + public anon key can read/write that
--   owner's rows. Accepted for this personal tool until the Owner asks to lock.
--
-- Phase 4b (do not run in v1):
--   1. Remap DEFAULT_OWNER_ID rows to auth.uid() (see docs/decisions/0002).
--   2. DROP POLICY *-v1-owner on each table.
--   3. CREATE POLICY *-auth-owner ... USING (owner_id = auth.uid())
--        WITH CHECK (owner_id = auth.uid()) TO authenticated;
--   4. REVOKE ALL ON <table> FROM anon;
--   5. Optional later: ALTER TABLE ... ADD FK owner_id REFERENCES auth.users(id);
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

create type public.sex as enum ('male', 'female');
create type public.goal_type as enum (
  'fat_loss',
  'fat_loss_retain_muscle',
  'recomp',
  'maintain'
);
create type public.meal_slot_kind as enum (
  'breakfast',
  'lunch',
  'dinner',
  'snack'
);
create type public.plan_status as enum ('active', 'archived');
create type public.visceral_fat_scale as enum ('inbody_level', 'tanita_rating');
create type public.favorite_kind as enum ('recipe', 'exercise');

-- Shared BodyID columns live on profiles and check_ins (no photos).
-- Optional machine fields are nullable; the engine ignores them in v1.

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  sex public.sex not null,
  birth_date date not null,
  height_cm numeric(5, 2) not null check (height_cm > 0),
  weight_kg numeric(6, 2) not null check (weight_kg > 0),
  body_fat_pct numeric(4, 1) not null check (body_fat_pct >= 0 and body_fat_pct <= 70),
  skeletal_muscle_mass_kg numeric(6, 2) not null check (skeletal_muscle_mass_kg > 0),
  body_fat_mass_kg numeric(6, 2) check (body_fat_mass_kg is null or body_fat_mass_kg >= 0),
  visceral_fat_level numeric(4, 1),
  visceral_fat_scale public.visceral_fat_scale,
  total_body_water_kg numeric(6, 2) check (total_body_water_kg is null or total_body_water_kg >= 0),
  diet_flags text[] not null default '{}',
  kitchen_flags text[] not null default '{}',
  gym_days_per_week integer not null check (gym_days_per_week between 1 and 7),
  servings integer not null default 1 check (servings >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  type public.goal_type not null,
  target_weight_kg numeric(6, 2) check (target_weight_kg is null or target_weight_kg > 0),
  start_on date not null,
  end_on date not null,
  weekly_loss_cap_pct numeric(3, 1) not null default 1.0
    check (weekly_loss_cap_pct > 0 and weekly_loss_cap_pct <= 1.0),
  created_at timestamptz not null default now(),
  constraint goals_end_after_start check (end_on > start_on),
  constraint goals_target_required_when_losing check (
    type = 'maintain' or target_weight_kg is not null
  )
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  goal_id uuid not null references public.goals (id) on delete restrict,
  status public.plan_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.plan_versions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  plan_id uuid not null references public.plans (id) on delete cascade,
  version_n integer not null check (version_n >= 1),
  bmr_kcal numeric(8, 2) not null,
  pal numeric(6, 4) not null,
  tdee_kcal numeric(10, 4) not null,
  energy_kcal integer not null,
  protein_g numeric(6, 1) not null,
  carb_g numeric(6, 1) not null,
  fat_g numeric(6, 1) not null,
  split_id text not null,
  cardio jsonb not null default '{}'::jsonb,
  warnings text[] not null default '{}',
  generator_input jsonb not null,
  created_at timestamptz not null default now(),
  unique (plan_id, version_n)
);

create table public.day_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  plan_version_id uuid not null references public.plan_versions (id) on delete cascade,
  on_date date not null,
  is_train_day boolean not null,
  is_deload boolean not null default false,
  unique (plan_version_id, on_date)
);

create table public.meal_slots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  day_plan_id uuid not null references public.day_plans (id) on delete cascade,
  slot public.meal_slot_kind not null,
  recipe_slug text not null,
  pinned boolean not null default false,
  eaten boolean not null default false,
  swapped_from_slug text,
  unique (day_plan_id, slot)
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  day_plan_id uuid not null references public.day_plans (id) on delete cascade,
  focus text not null,
  cardio jsonb not null default '{}'::jsonb,
  unique (day_plan_id)
);

create table public.workout_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  workout_session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_slug text not null,
  order_index integer not null check (order_index >= 0),
  sets jsonb not null default '[]'::jsonb,
  completed boolean not null default false
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  logged_on date not null,
  weight_kg numeric(6, 2) not null check (weight_kg > 0),
  body_fat_pct numeric(4, 1) not null,
  skeletal_muscle_mass_kg numeric(6, 2) not null,
  body_fat_mass_kg numeric(6, 2),
  visceral_fat_level numeric(4, 1),
  visceral_fat_scale public.visceral_fat_scale,
  total_body_water_kg numeric(6, 2),
  created_at timestamptz not null default now(),
  unique (owner_id, logged_on)
  -- Intentionally no photo / image columns.
);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  kind public.favorite_kind not null,
  slug text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, kind, slug)
);

create index goals_owner_id_idx on public.goals (owner_id);
create index plans_owner_id_idx on public.plans (owner_id);
create index plan_versions_owner_id_idx on public.plan_versions (owner_id);
create index day_plans_owner_id_idx on public.day_plans (owner_id);
create index meal_slots_owner_id_idx on public.meal_slots (owner_id);
create index workout_sessions_owner_id_idx on public.workout_sessions (owner_id);
create index workout_items_owner_id_idx on public.workout_items (owner_id);
create index check_ins_owner_id_idx on public.check_ins (owner_id);
create index favorites_owner_id_idx on public.favorites (owner_id);

-- v1 owner predicate (Phase 4b: stop using this; switch to auth.uid()).
create or replace function public.is_v1_owner(oid uuid)
returns boolean
language sql
immutable
as $$
  select oid = '198e5a49-c748-4bcc-b6ad-86445a76eb7b'::uuid;
$$;

-- Repeatable RLS helper pattern for each personal table.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles',
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
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (public.is_v1_owner(owner_id)) with check (public.is_v1_owner(owner_id))',
      t || '_v1_owner',
      t
    );
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
  end loop;
end
$$;

-- Phase 4b sketch (commented — do not uncomment in v1):
-- drop policy profiles_v1_owner on public.profiles;
-- create policy profiles_auth_owner on public.profiles
--   for all to authenticated
--   using (owner_id = auth.uid())
--   with check (owner_id = auth.uid());
-- revoke all on public.profiles from anon;
-- Repeat per personal table. Then remap DEFAULT_OWNER_ID → auth.uid().
