# Phase 1 critique notes

Target: `docs/ux/prototype/index.html` (clickable BodyPlan, bumper-plate load).

Impeccable Assessment A + B were run after screenshots (see below). Owner review of `DESIGN.md` is still the Phase 1 gate.

## What is working

- **Product-specific:** Today as a loaded bar (plate hubs + steel session) is not a generic habit diary. Printout strip matches BodyID, not photos.
- **Frozen §3 honoured:** metric, M/F, gym-only, user-selected diet/kitchen/days/goal/timeline, no login, no photos, disclaimer, unsafe-speed intercept, lock as copy on You.
- **Operate mode:** four-tab nav, 44px targets, labelled fields, numeric `inputmode`, one-exercise session with a set table (Strong), four always-on meal slots (Lifesum).
- **Ink discipline:** yellow Continue, cyan figures, red only on the speed banner.

## Issues to carry (not blocking Phase 1 docs)

1. **Unsafe date is opt-in.** Default target is safe; testers must set 1 Sep 2026 to see the banner. Phase 5 should preview implied % live as they type.
2. **Swap sheet focus trap** is incomplete in the prototype (throwaway). Production must trap focus and restore it.
3. **Plate-hub invert** can wash lunch green / dinner blue into odd greys. Production should use a filled inner hole, not CSS `filter: invert(1)`.
4. **Plan bento** leans toward generic metric tiles. Keep it as the only Aceternity-ish block; do not repeat on Today.
5. **Contrast on snack hub** (near-black plate on platform grey) relies on the iron ring — keep the ring at 3px.

## Heuristic snapshot (Operate)

| Heuristic | Score (0–4) |
| --- | --- |
| Visibility of system status | 3 (progress n of 5; eaten state) |
| Match to real world | 4 (printout, plates, gym days) |
| User control | 3 (back, swap keep-current, no skip-onboarding — onboarding is the product) |
| Consistency | 3 |
| Error prevention | 3 (unsafe banner) |
| Recognition vs recall | 3 |
| Flexibility | 2 (prototype paths are linear) |
| Aesthetic minimalism | 3 |
| Error recovery | 2 (little inline validation) |
| Help | 2 (disclaimer only) |

## Cognitive load

Onboarding step 4 (diet + kitchen + days) is the heaviest screen. Keep it as one step so first plan stays under three minutes; do not split into a SaaS wizard.

## Questions skipped

Owner review of DESIGN.md is the remaining gate. No sign-up flow was added.
