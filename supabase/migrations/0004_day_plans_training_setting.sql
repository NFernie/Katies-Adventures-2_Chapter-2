-- Repair live projects whose day_plans / workout_sessions tables predate
-- mixed-week (no day_plans.training_setting, and sometimes no
-- workout_sessions.setting). 0003 only repaired RLS / training_days.
-- Safe to re-run. Paste in the SQL Editor. The website cannot apply this
-- (no service_role).
--
-- Do not UPDATE from s.setting unless information_schema says that column
-- exists — live projects that applied a partial 0001 have workout_sessions
-- without setting (42703).

do $$ begin
  create type public.training_setting as enum (
    'gym', 'home', 'bands', 'bodyweight'
  );
exception when duplicate_object then null;
end $$;

grant usage on type public.training_setting to authenticated;

alter table public.day_plans
  add column if not exists training_setting public.training_setting;

do $$
begin
  if to_regclass('public.workout_sessions') is null then
    return;
  end if;
  alter table public.workout_sessions
    add column if not exists setting public.training_setting;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workout_sessions'
      and column_name = 'setting'
  ) then
    return;
  end if;
  update public.day_plans d
  set training_setting = s.setting
  from public.workout_sessions s
  where s.day_plan_id = d.id
    and d.is_train_day = true
    and d.training_setting is null
    and s.setting is not null;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'training_days'
      and column_name = 'setting'
  ) then
    return;
  end if;
  update public.day_plans d
  set training_setting = td.setting
  from public.training_days td
  where td.owner_id = d.owner_id
    and td.weekday = (array['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'])[
      extract(dow from d.on_date)::int + 1
    ]::public.weekday
    and d.is_train_day = true
    and d.training_setting is null;
end $$;

update public.day_plans
set training_setting = 'gym'
where is_train_day = true
  and training_setting is null;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workout_sessions'
      and column_name = 'setting'
  ) then
    return;
  end if;
  update public.workout_sessions s
  set setting = coalesce(d.training_setting, 'gym')
  from public.day_plans d
  where s.day_plan_id = d.id
    and s.setting is null;
  update public.workout_sessions
  set setting = 'gym'
  where setting is null;
  alter table public.workout_sessions
    alter column setting set not null;
end $$;

alter table public.day_plans drop constraint if exists day_plans_setting_when_training;

alter table public.day_plans
  add constraint day_plans_setting_when_training check (
    (is_train_day = false and training_setting is null)
    or (is_train_day = true and training_setting is not null)
  );

notify pgrst, 'reload schema';
