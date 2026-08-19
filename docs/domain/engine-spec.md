# Planning engine spec (pure maths)

Phase 2 lock for `src/engine` (Phase 5 implements). **No React. No Supabase. No `owner_id`.** Metric only. Gym equipment only. Four goal types. No photos. The only generator **block** is unsafe loss speed. Calorie floors are warnings, not medical hard-stops.

If a later agent finds a formula here ambiguous, **gate** — do not invent a second convention.

Worked-example literals also live in `docs/domain/fixtures/engine-examples.json` for Phase 5 tests (known-good values, not tautological recomputes inside the test).

---

## 1. Types (engine I/O)

The engine does not mention Owner.

```ts
export type Sex = "male" | "female";
export type GoalType =
  | "fat_loss"
  | "fat_loss_retain_muscle"
  | "recomp"
  | "maintain";

export type DietFlag =
  | "vegetarian"
  | "vegan"
  | "allergy_nuts"
  | "allergy_dairy"
  | "allergy_gluten"
  | "allergy_shellfish"
  | "allergy_egg"
  | "allergy_soy"
  | "cook_under_30";

export type KitchenFlag =
  | "batch_cook"
  | "leftovers_as_lunch"
  | "eating_out_days";

export type SplitId =
  | "full_body"
  | "upper_lower"
  | "upper_lower_plus"
  | "ppl_twice"
  | "ppl_twice_plus";

export type CardioKind = "none" | "zone2" | "intervals";

export interface EngineBody {
  sex: Sex;
  birthDate: string; // YYYY-MM-DD
  heightCm: number;
  weightKg: number;
  bodyFatPct: number; // InBody / Tanita; required in v1 examples
  skeletalMuscleMassKg: number;
  // Optional BodyID columns — accepted and ignored:
  bodyFatMassKg?: number | null;
  visceralFatLevel?: number | null;
  visceralFatScale?: "inbody_level" | "tanita_rating" | null;
  totalBodyWaterKg?: number | null;
}

export interface EngineGoal {
  type: GoalType;
  startOn: string; // YYYY-MM-DD; also the age as-of date
  endOn: string;
  targetWeightKg: number | null; // required unless type === "maintain"
  weeklyLossCapPct: number; // default 1.0; must be > 0 and <= 1.0
}

export interface EnginePrefs {
  gymDaysPerWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  dietFlags: DietFlag[];
  kitchenFlags: KitchenFlag[];
  servings: number; // >= 1; meal knapsack (Phase 6), not energy maths
}

export interface GeneratorBlock {
  code: "unsafe_loss_speed";
  impliedWeeklyLossPct: number;
  capPct: number;
  fastestSafeEndOn: string; // YYYY-MM-DD
}

export interface EngineSuccess {
  ok: true;
  ageYears: number;
  bmrKcal: number; // 2 decimal places as documented below
  pal: number;
  tdeeKcal: number; // full product; 5+ decimals ok in fixtures
  impliedWeeklyLossPct: number; // 0 when no loss
  dailyDeficitKcal: number;
  energyKcal: number; // nearest 10
  proteinG: number;
  fatG: number;
  carbG: number;
  macroChecksumKcal: number; // 4P + 4C + 9F
  warnings: Array<"below_calorie_floor">;
  splitId: SplitId;
  trainDayPattern: boolean[]; // length 7, Mon-start relative to startOn weekday unused; see §8
  cardio: { kind: CardioKind; sessionsPerWeek: number };
  deloadWeeks: number[]; // 1-based week indexes
}

export type EngineResult =
  | EngineSuccess
  | { ok: false; block: GeneratorBlock };
```

`dietFlags` / `kitchenFlags` / `servings` do not change energy maths. They constrain meal knapsack in Phase 6.

---

## 2. Locked constants

| Name | Value | Role |
| --- | --- | --- |
| Mifflin–St Jeor (male) | `10w + 6.25h − 5a + 5` | BMR; `w` kg, `h` cm, `a` whole years |
| Mifflin–St Jeor (female) | `10w + 6.25h − 5a − 161` | BMR |
| PAL 1–2 gym days | `1.375` | TDEE = BMR × PAL |
| PAL 3–5 gym days | `1.55` | |
| PAL 6–7 gym days | `1.725` | |
| Default weekly loss | `0.5%` of current weight | Only used when `targetWeightKg` is null (maintain, or missing target — see §5) |
| Loss-speed cap | `1.0%` of current weight / week | Only generator **block** |
| Energy density | `7700` kcal per kg | Deficit from planned kg loss |
| Protein g/kg (fat_loss) | `1.8` | × **current** `weightKg` |
| Protein g/kg (fat_loss_retain_muscle) | `2.2` | |
| Protein g/kg (recomp) | `2.0` | |
| Protein g/kg (maintain) | `1.6` | |
| Protein FFM factor | `2.2` g/kg fat-free mass | Floor when `bodyFatPct` present |
| SMM-to-FFM divisor | `0.50` | Floor: `2.2 * SMM / 0.50` |
| Protein cap | `2.2` g/kg current weight | After floors |
| Fat g/kg (fat_loss, fat_loss_retain_muscle) | `0.8` | |
| Fat g/kg (recomp, maintain) | `1.0` | |
| Fat minimum | `0.7` g/kg current weight | After table value |
| Atwater | protein 4, carb 4, fat 9 kcal/g | Carbs fill remainder |
| Calorie-floor warning (female) | `1200` kcal/day | Warning only; do not block; do not raise kcal |
| Calorie-floor warning (male) | `1500` kcal/day | Warning only |

Protein uses **current InBody weight**, never goal weight. Optional BodyID fields (`bodyFatMassKg`, visceral, TBW) are **ignored**. Machine-printed BMR is **ignored**.

---

## 3. Age

`ageYears` is whole years on `goal.startOn` (not “today” at runtime).

```
ageYears = startOn.year - birthDate.year
if (startOn.month, startOn.day) < (birthDate.month, birthDate.day):
  ageYears -= 1
```

---

## 4. BMR and TDEE

Use exact rational arithmetic (or IEEE-754 that matches these fixtures). Do not round BMR before multiplying PAL.

```
bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + (5 if male else -161)
pal = 1.375 if gymDays in {1,2}
    | 1.55  if gymDays in {3,4,5}
    | 1.725 if gymDays in {6,7}
tdee = bmr * pal
```

Report `bmrKcal` with **2 decimal places** (half-up) in fixtures. Keep full `tdee` for the energy step.

---

## 5. Timeline, deficit, and the only block

`days = (endOn - startOn)` in whole calendar days. `endOn` must be strictly after `startOn`. `weeks = days / 7` (exact, not truncated).

**Maintain:** `targetWeightKg` may be null. `dailyDeficitKcal = 0`. `impliedWeeklyLossPct = 0`. Never a speed block.

**Fat loss / fat_loss_retain_muscle / recomp:** `targetWeightKg` is required and must be `< weightKg`. (If `targetWeightKg >= weightKg`, treat as maintain energy: deficit 0, no speed block.)

```
lossKg = weightKg - targetWeightKg
impliedWeeklyLossPct = 100 * lossKg / weightKg / weeks
```

If `impliedWeeklyLossPct > weeklyLossCapPct` (default cap `1.0`):

- **Block** with `code = "unsafe_loss_speed"`.
- Do not emit energy or macros.
- `fastestSafeEndOn = startOn + daysMin`, where

```
daysMin = ceil(700 * lossKg / weightKg)
```

`ceil` is mathematical ceiling (any fractional part rounds up). This is the smallest integer day count such that implied weekly % is `<= 1.0` when the cap is `1.0`. For a cap `C` other than `1.0` (still `C <= 1.0`):

```
daysMin = ceil(700 * lossKg / (weightKg * C))
```

Equal-to-cap is **allowed**. User may go slower (later `endOn` or higher target). User may not go faster.

When not blocked:

```
dailyDeficitKcal = (lossKg * 7700) / days
energyUnrounded = tdee - dailyDeficitKcal
energyKcal = round_half_up(energyUnrounded / 10) * 10
```

`round_half_up` means 0.5 away from 0 for these positive values (Python `Decimal.ROUND_HALF_UP`).

Default **0.5% / week** is the onboarding suggestion when the Owner has not picked a target yet. Once `targetWeightKg` and `endOn` exist, energy comes from the implied kg loss, not from 0.5%.

---

## 6. Macros

```
ffmKg = weightKg * (1 - bodyFatPct / 100)
proteinRaw = max(
  coeff(goal) * weightKg,
  2.2 * ffmKg,
  2.2 * skeletalMuscleMassKg / 0.50
)
proteinRaw = min(proteinRaw, 2.2 * weightKg)
proteinG = round_half_up(proteinRaw)   # nearest 1 g

fatRaw = max(fat_coeff(goal) * weightKg, 0.7 * weightKg)
fatG = round_half_up(fatRaw)

remainKcal = energyKcal - proteinG * 4 - fatG * 9
carbG = round_half_up(remainKcal / 4)
macroChecksumKcal = proteinG * 4 + carbG * 4 + fatG * 9
```

If `remainKcal < 0`, reduce `fatG` toward `round_half_up(0.7 * weightKg)` until remainder is non-negative or the floor is hit. If still negative, set `carbG = 0`, leave fat at the floor, and still **succeed** (not a block). Neither worked example hits this.

If `|macroChecksumKcal - energyKcal| > 10`, nudge `carbG` by ±1 g once toward the closer checksum. Both worked examples checksum **exactly**.

**Warning (not a block):** if `energyKcal < (1500 if male else 1200)`, append `"below_calorie_floor"`. Do **not** raise kcal. Do **not** refuse generate. Do **not** add pregnancy / BMI / age / ED gates.

---

## 7. Training (gym only, same menu M/F)

Session count = `gymDaysPerWeek` (user-selected). Cardio is **generator-chosen** from goal type, not an onboarding preference. Deload every 4th week (1-based week index `4, 8, 12, …` while that week still falls inside `startOn..endOn`). Deload: planned sets × `0.6`, no intensity PR (Phase 5/7). Same exercise catalog for male and female.

| `gymDaysPerWeek` | `splitId` | Lift pattern (repeat each week) |
| --- | --- | --- |
| 1–3 | `full_body` | FB × N |
| 4 | `upper_lower` | U, L, U, L |
| 5 | `upper_lower_plus` | U, L, U, L, FB |
| 6 | `ppl_twice` | Push, Pull, Legs, Push, Pull, Legs |
| 7 | `ppl_twice_plus` | PPL × 2 + 7th day cardio or rest (no extra lift catalog) |

| Goal type | Cardio |
| --- | --- |
| `fat_loss` | `zone2`, `sessionsPerWeek = 2` if gym days ≥ 4 else `1` |
| `fat_loss_retain_muscle` | `zone2`, `1` |
| `recomp` | `intervals`, `1` |
| `maintain` | `none`, `0` if gym days ≥ 4; else `zone2`, `1` |

Cardio may share a gym day (after the lift) when there is no rest day. Home / bands / bodyweight tracks are out of v1.

Meal assignment is **out of this spec** (Phase 6 knapsack over catalog tags). Energy/macros above are inputs to that knapsack.

---

## 8. Worked example A — male

**Inputs** (synthetic; gym days user-selected; InBody fat % present)

| Field | Value |
| --- | --- |
| sex | male |
| birthDate | 1990-03-15 |
| heightCm | 178 |
| weightKg | 88.0 |
| bodyFatPct | 22.0 |
| skeletalMuscleMassKg | 36.5 |
| gymDaysPerWeek | 4 |
| goal type | fat_loss |
| startOn | 2026-08-18 |
| endOn | 2026-12-08 |
| targetWeightKg | 80.0 |
| weeklyLossCapPct | 1.0 |
| diet / kitchen | (ignored by energy) |

**Intermediates**

| Step | Value |
| --- | --- |
| ageYears | 36 |
| BMR | `10×88 + 6.25×178 − 5×36 + 5` = **1817.50** |
| PAL | 4 days → **1.55** |
| TDEE | 1817.50 × 1.55 = **2817.125** |
| days | 112 (exactly 16 weeks) |
| lossKg | 8.0 |
| impliedWeeklyLossPct | `100 × 8 / 88 / 16` = **0.568181…** (≤ 1.0, allowed) |
| dailyDeficitKcal | `8 × 7700 / 112` = **550** |
| energyUnrounded | 2817.125 − 550 = 2267.125 |
| energyKcal | **2270** |
| proteinRaw | max(1.8×88, 2.2×68.64, 2.2×36.5/0.50) = max(158.4, 151.008, 160.6) then min(…, 193.6) = **160.6** |
| proteinG | **161** |
| fatG | round(0.8×88) = **70** |
| carbG | (2270 − 161×4 − 70×9) / 4 = **249** |
| macroChecksumKcal | **2270** |
| warnings | `[]` |
| splitId | `upper_lower` |
| cardio | zone2 × 2 |
| deloadWeeks | `[4, 8, 12, 16]` |

Not blocked. Male floor 1500: 2270 ≥ 1500.

---

## 9. Worked example B — female

**Inputs**

| Field | Value |
| --- | --- |
| sex | female |
| birthDate | 1994-11-02 |
| heightCm | 165 |
| weightKg | 72.0 |
| bodyFatPct | 28.0 |
| skeletalMuscleMassKg | 26.0 |
| gymDaysPerWeek | 6 |
| goal type | fat_loss_retain_muscle |
| startOn | 2026-08-18 |
| endOn | 2026-11-10 |
| targetWeightKg | 66.0 |
| weeklyLossCapPct | 1.0 |

**Intermediates**

| Step | Value |
| --- | --- |
| ageYears | 31 (birthday 2 Nov, not yet on 18 Aug) |
| BMR | `10×72 + 6.25×165 − 5×31 − 161` = **1435.25** |
| PAL | 6 days → **1.725** |
| TDEE | 1435.25 × 1.725 = **2475.80625** |
| days | 84 (exactly 12 weeks) |
| lossKg | 6.0 |
| impliedWeeklyLossPct | `100 × 6 / 72 / 12` = **0.694444…** (≤ 1.0, allowed) |
| dailyDeficitKcal | `6 × 7700 / 84` = **550** |
| energyUnrounded | 2475.80625 − 550 = 1925.80625 |
| energyKcal | **1930** |
| proteinRaw | max(2.2×72, 2.2×51.84, 2.2×26.0/0.50) = max(158.4, 114.048, 114.4) = **158.4** |
| proteinG | **158** |
| fatG | round(0.8×72) = **58** |
| carbG | (1930 − 158×4 − 58×9) / 4 = **194** |
| macroChecksumKcal | **1930** |
| warnings | `[]` |
| splitId | `ppl_twice` |
| cardio | zone2 × 1 |
| deloadWeeks | `[4, 8, 12]` |

Not blocked. Female floor 1200: 1930 ≥ 1200.

---

## 10. Speed-block check (same female body, unsafe date)

Not a third success fixture. Same female inputs except `endOn = 2026-09-01` (14 days), still targeting 66 kg.

- impliedWeeklyLossPct = `100 × 6 / 72 / 2` = **4.1666…** > 1.0 → **block**
- daysMin = ceil(700 × 6 / 72) = ceil(58.333…) = **59**
- fastestSafeEndOn = 2026-08-18 + 59 days = **2026-10-16**

---

## 11. Phase 5 test seam

One public function, e.g. `planEnergyAndTraining(body, goal, prefs) -> EngineResult`. Tests assert against the JSON literals in `docs/domain/fixtures/engine-examples.json`. Do not recompute expected kcal inside the test.

Independent recompute (second agent, 19 Aug 2026, formulae + inputs only, no spec file): **matched** male 2270 / 161 / 70 / 249, female 1930 / 158 / 58 / 194, unsafe `2026-10-16` / 59 days.

---

## 12. Honour §3

Metric; gym only; four goal types; no photos; unsafe speed is the only generator block. Disclaimer copy is UI, not engine I/O.
