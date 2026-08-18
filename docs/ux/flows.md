# BodyPlan flows (v1)

Mobile web, one Owner, no account. Visitor mode: **Operate**. First plan in under three minutes.

Screenshots of the clickable prototype: `docs/ux/prototype/README.md`.

## 0. Entry

`/` → if no plan, `/onboarding`. If a plan exists, `/` is **Today**. There is no marketing landing and no sign-up.

## 1. Onboarding (five steps)

Airport-band rule: **one decision per screen**. Bottom yellow **Continue** strip. Back is always available. Progress is “2 of 5”, not a locked tour.

| Step | Job | Collects |
| --- | --- | --- |
| 1 You | Who the maths is for | Sex (male / female), age (years), height (cm) |
| 2 Printout | Transcribe BodyID | Weight (kg), body fat %, skeletal muscle mass (kg) |
| 3 Aim | Choose work | Goal type (four chips) + target date |
| 4 Kitchen & gym | Filter the catalogs | Diet flags, kitchen flags, gym days/week (1–7). **No cardio preference.** |
| 5 Review | Commit | Preview kcal, protein, weeks. Disclaimer. Generate → Today |

**Unsafe loss speed:** if the date implies > 1.0% body weight / week, Continue stays on this step. Copy names the fastest safe date. The Owner may pick that date or a slower one. No BMI / age / pregnancy / ED hard-stop.

**Disclaimer (review):** “BodyPlan is a personal planner, not medical treatment. For adults 18+.”

## 2. Today (habit home)

Lifesum-shaped **four meal slots always listed**. Strong-shaped **one session**, not a social feed.

1. Printout strip: weight · BF% · SMM (tabular).
2. **Loaded bar:** four plate-hubs (meals) + the iron bar (today’s workout). Checking a hub marks that meal done.
3. Packed meal modules: Breakfast / Lunch / Dinner / Snack — title, kcal, protein, **Ate it** (44px), **Swap**.
4. Deep gap, then the workout block: name, movement count, **Start**.

Bottom nav: **Today · Plan · Log · You**.

## 3. Swap (meal or lift)

Sheet from the bottom (not a route, not a login). Three alternatives.

- Meals: same slot, ±10% kcal, ±20% protein. Pin stays available.
- Lifts: same movement pattern + gym equipment.

Owner taps one alternative → sheet closes → Today updates. Cancel / back / scrim dismiss.

## 4. Session (workout player)

Strong, not Hevy-social: **one exercise at a time** on the phone.

- Exercise name, gym equipment, previous (synthetic in the prototype).
- Set table: Set / kg / Reps / ✓. Tabular numbers. Rest hint after a check.
- Next exercise / Finish. Skip records a skip (2+ in a week → deload prompt lives in Phase 7).

## 5. Plan / Timeline

- **Plan:** goal, dates, kcal, macros, split, “why this plan”. Week strip; tap a day → that day’s Today.
- **Timeline / Log:** projected vs actual weight from check-ins. **Add check-in** = same BodyID fields, no photos. Regenerating confirms pins are kept.

## 6. You (settings)

Profile (metric). Regenerate. Quiet copy, **not a button:**

> Locking this data with an email link comes later. This version has no sign-in.

## Anti-flows (v1)

Sign-up, login, OAuth, photo upload, imperial toggle, home-gym picker, cardio preference, `/lock`.
