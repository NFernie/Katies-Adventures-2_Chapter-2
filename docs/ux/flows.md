# BodyPlan flows (v1)

Mobile web, one Owner. Visitor mode: **Operate**. First plan in under three minutes. Persistence uses **Create account** (one confirmation link) then **Sign in** (confirmed email + password). Onboarding itself is not a SaaS sign-up funnel.

Screenshots of the clickable prototype: `docs/ux/prototype/README.md`. HTML is the source of truth after the mixed-week amendment; stills were not regenerated.

## 0. Entry

`/` → if no plan, `/onboarding`. If a plan exists, `/` is **Today**. There is no marketing landing. Signed-out personal data is hidden (Phase 4); `/lock` is Sign in / Create account and completes the confirmation link.

## 1. Onboarding (five steps)

Airport-band rule: **one decision per screen**. Bottom yellow **Continue** strip. Back is always available. Progress is “2 of 5”, not a locked tour.

| Step | Job | Collects |
| --- | --- | --- |
| 1 You | Who the maths is for | Sex (male / female), age (years), height (cm) |
| 2 Printout | Transcribe BodyID | Weight (kg), body fat %, skeletal muscle mass (kg) |
| 3 Aim | Choose work | Goal type (four chips) + target date |
| 4 Kitchen & training | Filter catalogs + week map | Diet flags, kitchen flags, **7 weekdays** each Rest or Gym / Home / Bands / Bodyweight. **No cardio preference.** ≥1 train day to Continue. |
| 5 Review | Commit | Preview kcal, protein, weeks, train-day count. Disclaimer. Generate → Today |

**Unsafe loss speed:** if the date implies > 1.0% body weight / week, Continue stays on this step. Copy names the fastest safe date. The Owner may pick that date or a slower one. No BMI / age / pregnancy / ED hard-stop.

**Disclaimer (review):** “BodyPlan is a personal planner, not medical treatment. For adults 18+.”

## 2. Today (habit home)

Lifesum-shaped **four meal slots always listed**. Strong-shaped **one session**, not a social feed.

1. Printout strip: weight · BF% · SMM (tabular).
2. **Loaded bar:** four plate-hubs (meals) + the iron bar (today’s workout). Checking a hub marks that meal done.
3. Packed meal modules: Breakfast / Lunch / Dinner / Snack — title, kcal, protein, **Ate it** (44px), **Swap**.
4. Deep gap, then the workout block: name, **that day’s setting**, movement count, **Start**. Rest days have meals only.

Bottom nav: **Today · Plan · Log · You**.

## 3. Swap (meal or lift)

Sheet from the bottom (not a route). Three alternatives.

- Meals: same slot, ±10% kcal / ±20% protein of the slot target when the catalog has them; otherwise the next USDA-checked meals in that slot. Pin stays available.
- Lifts: same movement pattern **+ that day’s training setting**.

Owner taps one alternative → sheet closes → Today updates. Cancel / back / scrim dismiss.

## 4. Session (workout player)

Strong, not Hevy-social: **one exercise at a time** on the phone.

- Exercise name, **setting** (gym / home / bands / bodyweight), previous (synthetic in the prototype).
- Set table: Set / kg / Reps / ✓. Tabular numbers. Rest hint after a check.
- Next exercise / Finish. Skip records a skip (2+ in a week → deload prompt lives in Phase 7).

## 5. Plan / Timeline

- **Plan:** goal, dates, kcal, macros, split, “why this plan”. Week strip shows each day’s **setting**; tap a day → that day’s Today.
- **Timeline / Log:** projected vs actual weight from check-ins. **Add check-in** = same BodyID fields, no photos. Regenerating confirms pins are kept.

## 6. You (settings)

Profile (metric). Regenerate. **Sign in** (email + password) and **Create account** (confirmation link once). Iron buttons, not yellow. `/lock` completes the emailed link. Must not look like a disabled fake login.

## Anti-flows (v1)

Google OAuth, photo upload, imperial toggle, one global “home-gym track” instead of a weekday map, cardio preference as an onboarding chip, NextAuth, email-only login with no password.
