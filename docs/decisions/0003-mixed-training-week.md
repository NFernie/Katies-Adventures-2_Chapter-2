# ADR 0003: Mixed training week

**Status:** Accepted (2026-08-19). Supersedes the Phase 2 freeze that stored only `profiles.gym_days_per_week` and assumed every session was gym equipment.

## Context

Q9 originally asked how many gym days per week. The owner then asked to mix **gym, home, bands, and bodyweight** in the **same week** (example: gym Tuesday, bands Thursday). That is not a later catalog-only change: onboarding, persistence, the engine, and every session’s swap pool all need the day’s setting.

## Decision

A training week is seven weekdays. Each weekday is either **rest** (no row / `"rest"`) or one **Training setting**: `gym` | `home` | `bands` | `bodyweight`. At least one weekday must be a train day.

- Persist as personal table `training_days` (`owner_id`, `weekday`, `setting`). Unique `(owner_id, weekday)`. Rest days have no row.
- Drop `profiles.gym_days_per_week`.
- Engine input is `trainingWeek: Record<Weekday, TrainingSetting | "rest">`. `trainingDaysPerWeek` is the **count** of non-rest days.
- PAL and the split still come from that **count**. The day’s **setting** only filters which exercises may appear and which swaps are legal.
- Cardio remains generator-chosen (Q10). Same movement rules for male and female.

## Consequences

- Onboarding is a seven-cell weekday picker, not a 1–7 gym stepper.
- Catalog JSON tags each exercise with `tracks` matching the four settings.
- Male 4-day and female 6-day energy fixtures keep the same kcal/macro numbers; only the week **map** is mixed.

## Alternatives rejected

- One global “track” for the whole plan (too coarse for the owner’s week).
- Storing setting on the generated session only (onboarding would not survive regenerate).
- Changing PAL by setting (gym vs bands). Energy still follows day **count**.
