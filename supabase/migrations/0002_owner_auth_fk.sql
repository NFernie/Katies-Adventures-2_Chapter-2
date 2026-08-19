-- Optional owner_id → auth.users FK. Apply after 0001_init.sql in a hosted
-- project (Auth is on). Do not apply without credentials.
--
-- Personal writes still set owner_id from session.user.id. This constraint
-- rejects rows that are not a real Auth user.

alter table public.profiles
  add constraint profiles_owner_id_auth_fk
  foreign key (owner_id) references auth.users (id);

alter table public.training_days
  add constraint training_days_owner_id_auth_fk
  foreign key (owner_id) references auth.users (id);

alter table public.goals
  add constraint goals_owner_id_auth_fk
  foreign key (owner_id) references auth.users (id);

alter table public.plans
  add constraint plans_owner_id_auth_fk
  foreign key (owner_id) references auth.users (id);

alter table public.plan_versions
  add constraint plan_versions_owner_id_auth_fk
  foreign key (owner_id) references auth.users (id);

alter table public.day_plans
  add constraint day_plans_owner_id_auth_fk
  foreign key (owner_id) references auth.users (id);

alter table public.meal_slots
  add constraint meal_slots_owner_id_auth_fk
  foreign key (owner_id) references auth.users (id);

alter table public.workout_sessions
  add constraint workout_sessions_owner_id_auth_fk
  foreign key (owner_id) references auth.users (id);

alter table public.workout_items
  add constraint workout_items_owner_id_auth_fk
  foreign key (owner_id) references auth.users (id);

alter table public.check_ins
  add constraint check_ins_owner_id_auth_fk
  foreign key (owner_id) references auth.users (id);

alter table public.favorites
  add constraint favorites_owner_id_auth_fk
  foreign key (owner_id) references auth.users (id);
