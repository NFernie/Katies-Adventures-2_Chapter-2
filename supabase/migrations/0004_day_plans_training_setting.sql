-- Repair live projects whose day_plans table predates mixed-week (no
-- training_setting column). 0003 only repaired RLS / training_days — it did
-- not ALTER day_plans. Safe to re-run. Paste in the SQL Editor. The website
-- cannot apply this (no service_role).

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
  update public.day_plans d
  set training_setting = s.setting
  from public.workout_sessions s
  where s.day_plan_id = d.id
    and d.is_train_day = true
    and d.training_setting is null;
end $$;

update public.day_plans
set training_setting = 'gym'
where is_train_day = true
  and training_setting is null;

alter table public.day_plans drop constraint if exists day_plans_setting_when_training;

alter table public.day_plans
  add constraint day_plans_setting_when_training check (
    (is_train_day = false and training_setting is null)
    or (is_train_day = true and training_setting is not null)
  );

notify pgrst, 'reload schema';
