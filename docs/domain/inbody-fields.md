# v1 InBody / Tanita (BodyID) fields

Profile and check-ins are built around **machine readouts**, not tape estimates or photos (`InitialPlan180826.md` §3 items 5 and 16). This list is the Phase 0 capture set. Phase 2 names columns on the ERD; it may add optional extras that stay in this family. It must not replace BodyID with photos, tape, or imperial units.

Engine maths still uses **Mifflin–St Jeor** for BMR. A machine-printed BMR is not an input.

## Required (onboarding and every check-in)

| Field | Unit | Role |
| --- | --- | --- |
| `weight_kg` | kg | Mass for BMR, TDEE, timeline, progress |
| `body_fat_pct` | % | Prefer this over estimated body fat |
| `skeletal_muscle_mass_kg` | kg | Informs protein when present; progress |

Tanita printouts often say “muscle mass” rather than “skeletal muscle mass”. Store it as `skeletal_muscle_mass_kg` and keep a short note if the machine label differs.

## Optional columns (Phase 2: stored, engine ignores)

Nullable on `profiles` and `check_ins`. Staying in the BodyID family is required; adding a different source (tape, photos) is not. The planning engine **does not read** these in v1.

| Field | Typical machine label | Notes |
| --- | --- | --- |
| `body_fat_mass_kg` | Body fat mass / BFM | Often printed next to % |
| `visceral_fat_level` | Visceral fat level / rating | Number from the printout |
| `visceral_fat_scale` | — | `inbody_level` or `tanita_rating` (the scale name, stored next to the number) |
| `total_body_water_kg` | Total body water / TBW | Common InBody line |

## Same family, not a different source

Height is **`height_cm`** (metric, onboarding). Age is **`birth_date`** (copy: 18+; not a generator hard-stop). Sex is **male or female**. Check-ins reuse the required BodyID fields above on a date. **No photos.**

## Further planning (not v1)

Segmental lean / body-fat charts, raw impedance, InBody Score, metabolic age, physique rating, and using machine BMR instead of Mifflin–St Jeor.
