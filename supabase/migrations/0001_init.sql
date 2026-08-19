-- BodyPlan v1 schema proposal (Phase 2, revision 5).
-- DO NOT APPLY without Owner credentials (Phase 4). No secrets in this repo.
--
-- DEFAULT_OWNER_ID is test/fixture only: 198e5a49-c748-4bcc-b6ad-86445a76eb7b
-- Catalog (recipes/exercises) is git JSON — do not create catalog tables here.
-- No NextAuth tables. No photo columns.
-- Optional later: ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY (owner_id) REFERENCES auth.users(id);
--
-- ---------------------------------------------------------------------------
-- RLS: auth at persistence (no Phase 4b remap)
-- ---------------------------------------------------------------------------
-- authenticated: ALL when owner_id = auth.uid().
-- REVOKE ALL FROM anon on every personal table.
-- Do not create is_v1_owner / open DEFAULT_OWNER_ID policies.
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
create type public.weekday as enum (
  'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'
);
create type public.training_setting as enum (
  'gym', 'home', 'bands', 'bodyweight'
);

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
  servings integer not null default 1 check (servings >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id)
);

create table public.training_days (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  weekday public.weekday not null,
  setting public.training_setting not null,
  unique (owner_id, weekday)
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
  training_setting public.training_setting,
  is_deload boolean not null default false,
  unique (plan_version_id, on_date),
  constraint day_plans_setting_when_training check (
    (is_train_day = false and training_setting is null)
    or (is_train_day = true and training_setting is not null)
  )
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
  setting public.training_setting not null,
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

create index training_days_owner_id_idx on public.training_days (owner_id);
create index goals_owner_id_idx on public.goals (owner_id);
create index plans_owner_id_idx on public.plans (owner_id);
create index plan_versions_owner_id_idx on public.plan_versions (owner_id);
create index day_plans_owner_id_idx on public.day_plans (owner_id);
create index meal_slots_owner_id_idx on public.meal_slots (owner_id);
create index workout_sessions_owner_id_idx on public.workout_sessions (owner_id);
create index workout_items_owner_id_idx on public.workout_items (owner_id);
create index check_ins_owner_id_idx on public.check_ins (owner_id);
create index favorites_owner_id_idx on public.favorites (owner_id);

-- Auth-scoped RLS. No is_v1_owner. No open anon policy.
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
