# BodyPlan ERD (auth-ready, v1)

Personal rows always carry `owner_id`. Catalog is git JSON and has **no** `owner_id`. There is no singleton “the one profile in the database” table. No NextAuth `Account` / `Session` tables. No `auth.users` foreign key in v1. No photo columns.

Source: `InitialPlan180826.md` §2.2 and §5.2. Engine maths: `docs/domain/engine-spec.md`. Recipe shape: `docs/domain/content-model.md`. SQL proposal: `supabase/migrations/0001_init.sql` (**do not apply** without credentials).

## DEFAULT_OWNER_ID contract

Generate once, commit, use until Phase 4b remap.

```ts
// src/data/owner.ts — created in Phase 3 scaffold; UUID locked here in Phase 2.
export const DEFAULT_OWNER_ID =
  "198e5a49-c748-4bcc-b6ad-86445a76eb7b" as const;

export function getOwnerId(): string {
  return DEFAULT_OWNER_ID;
}
```

v1 inserts and selects filter to this UUID. The engine never sees it. Phase 4b: `getOwnerId()` reads `session.user.id`; SQL remaps rows; this constant is deleted.

## Personal vs catalog

| Kind | Storage | `owner_id` |
| --- | --- | --- |
| Personal plan data | Supabase Postgres | **required** `uuid not null` |
| Catalog recipes / exercises | `data/recipes.json`, `data/exercises.json` | **absent** |

Swaps, pins, eaten flags, and favorites are personal rows (they point at catalog slugs). The catalog files are not rewritten from the public site.

## Entity relationship

```mermaid
erDiagram
  profiles ||--o{ goals : owner
  profiles ||--o{ plans : owner
  profiles ||--o{ check_ins : owner
  profiles ||--o{ favorites : owner
  goals ||--o{ plans : for
  plans ||--o{ plan_versions : versions
  plan_versions ||--o{ day_plans : days
  day_plans ||--o{ meal_slots : meals
  day_plans ||--o{ workout_sessions : sessions
  workout_sessions ||--o{ workout_items : items

  profiles {
    uuid id PK
    uuid owner_id UK "unique(owner_id)"
    enum sex "male | female"
    date birth_date
    numeric height_cm
    numeric weight_kg
    numeric body_fat_pct
    numeric skeletal_muscle_mass_kg
    numeric body_fat_mass_kg "nullable"
    numeric visceral_fat_level "nullable"
    enum visceral_fat_scale "nullable"
    numeric total_body_water_kg "nullable"
    text[] diet_flags
    text[] kitchen_flags
    int gym_days_per_week "1-7"
    int servings
  }

  goals {
    uuid id PK
    uuid owner_id
    enum type "four goal types"
    numeric target_weight_kg
    date start_on
    date end_on
    numeric weekly_loss_cap_pct "default 1.0, max 1.0"
  }

  plans {
    uuid id PK
    uuid owner_id
    uuid goal_id FK
    text status "active | archived"
  }

  plan_versions {
    uuid id PK
    uuid owner_id
    uuid plan_id FK
    int version_n
    jsonb generator_input
  }

  day_plans {
    uuid id PK
    uuid owner_id
    uuid plan_version_id FK
    date on_date
    bool is_train_day
    bool is_deload
  }

  meal_slots {
    uuid id PK
    uuid owner_id
    uuid day_plan_id FK
    enum slot
    text recipe_slug
  }

  workout_sessions {
    uuid id PK
    uuid owner_id
    uuid day_plan_id FK
  }

  workout_items {
    uuid id PK
    uuid owner_id
    uuid workout_session_id FK
    text exercise_slug
  }

  check_ins {
    uuid id PK
    uuid owner_id
    date logged_on
    numeric weight_kg
    numeric body_fat_pct
    numeric skeletal_muscle_mass_kg
  }

  favorites {
    uuid id PK
    uuid owner_id
    text kind "recipe | exercise"
    text slug
  }
```

Catalog boxes are omitted on purpose: they are not Postgres tables in v1.

## Table rules

Every personal table listed in §2.2 has `owner_id uuid not null`:

`profiles`, `goals`, `plans`, `plan_versions`, `day_plans`, `meal_slots`, `workout_sessions`, `workout_items`, `check_ins`, `favorites`.

- **`profiles`:** `unique (owner_id)` — one profile per owner, many owners possible later. Metric only: `height_cm`, `weight_kg`. Sex `male` | `female` only.
- **`goals`:** `type` is one of `fat_loss`, `fat_loss_retain_muscle`, `recomp`, `maintain`. `target_weight_kg` required except `maintain`. `weekly_loss_cap_pct` defaults to `1.0` and must be `> 0` and `<= 1.0` (user may go slower via a later `end_on`, not by raising the cap).
- **`plans` / `plan_versions`:** a new version on profile or goal change; older weeks stay readable. Version row stores BMR, PAL, TDEE, energy, macros, split, cardio prescription, warnings, and the full `generator_input` snapshot.
- **`day_plans`:** one row per calendar date in the version. `is_deload` from the engine (every 4th week). `is_train_day` from user-selected gym days.
- **`meal_slots`:** four kinds: `breakfast`, `lunch`, `dinner`, `snack`. `recipe_slug` points at catalog JSON. `pinned`, `eaten`, `swapped_from_slug` are personal.
- **`workout_sessions` / `workout_items`:** gym catalog slugs only. Sets live in `sets` jsonb. Cardio is a session field chosen by the generator, not an onboarding preference.
- **`check_ins`:** BodyID snapshot on a date. **No photos.** Same required + optional machine fields as `profiles`. Unique `(owner_id, logged_on)`.
- **`favorites`:** unique `(owner_id, kind, slug)`.

Diet and kitchen flags are closed slugs from `content-model.md` (`text[]` on `profiles`). `servings` is a positive integer on `profiles` (household size for the knapsack), not a tag.

## What must not appear

- NextAuth `users` / `accounts` / `sessions` / `verification_tokens`
- `references auth.users(id)` in v1
- Photo / image URL columns
- Imperial unit columns
- Home-gym / bands / bodyweight track flags
- Catalog tables with `owner_id`
- A `profiles` table that can only hold one row in the whole database (missing `owner_id`, or a check that `count(*) = 1`)

## RLS (see migration comments)

v1: `anon` and `authenticated` may all-rows on a personal table **only** when `owner_id = DEFAULT_OWNER_ID`.

Phase 4b: drop that policy; `owner_id = auth.uid()` for `authenticated`; revoke `anon`.
