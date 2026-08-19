# Phase 1 critique notes

⚠️ DEGRADED: single-context (critique A/B not isolated sub-agents; detector regex fallback because htmlparser2 is unavailable).

Target: `docs/ux/prototype/index.html` (clickable BodyPlan, bumper-plate load). Stills: `docs/ux/prototype/screenshots/`.

Impeccable `detect.mjs --json` on the prototype: **0 findings** after tokens were aligned to `DESIGN.md`. Owner review of `DESIGN.md` is still the Phase 1 gate.

## What is working

- **Product-specific:** Today as a loaded bar (plate hubs + steel session) is not a generic habit diary. Printout strip matches BodyID, not photos.
- **Frozen §3 honoured:** metric, M/F, mixed training week, user-selected diet/kitchen/goal/timeline, no photos, disclaimer, unsafe-speed intercept, magic-link copy on You (Phase 4 product, not a disabled fake).
- **Operate mode:** four-tab nav, 44px targets, labelled fields, numeric `inputmode`, one-exercise session with a set table (Strong), four always-on meal slots (Lifesum).
- **Ink discipline:** yellow Continue, cyan figures, red only on the speed banner.

## Issues to carry (not blocking Phase 1 docs)

1. **Unsafe date is opt-in.** Default target is safe; testers must set 1 Sep 2026 to see the banner. Phase 5 should preview implied % live as they type.
2. **Swap sheet focus trap** is incomplete in the prototype (throwaway). Production must trap focus and restore it.
3. **Plate-hub invert** can wash lunch green / dinner blue into odd greys. Production should use a filled inner hole, not CSS `filter: invert(1)`.
4. **Plan bento** leans toward generic metric tiles. Keep it as the only Aceternity-ish block; do not repeat on Today.
5. **Contrast on snack hub** (near-black plate on platform grey) relies on the iron ring — keep the ring at 3px.

**Addressed 19 Aug 2026 (owner caveat, no new stills):** helper copy (`.muted` / **iron-2**) darkened `#2c2c2c` → `#1a1a1a` so printout instructions hold on platform grey. PNG stills in `screenshots/` predate that tweak; HTML is source of truth.

## Heuristic snapshot (Operate)

| Heuristic | Score (0–4) |
| --- | --- |
| Visibility of system status | 3 (progress n of 5; eaten state) |
| Match to real world | 4 (printout, plates, weekday settings) |
| User control | 3 (back, swap keep-current, no skip-onboarding — onboarding is the product) |
| Consistency | 3 |
| Error prevention | 3 (unsafe banner) |
| Recognition vs recall | 3 |
| Flexibility | 2 (prototype paths are linear) |
| Aesthetic minimalism | 3 |
| Error recovery | 2 (little inline validation) |
| Help | 2 (disclaimer only) |

## Cognitive load

Onboarding step 4 (diet + kitchen + weekday settings) is the heaviest screen. Keep it as one step so first plan stays under three minutes; do not split into a SaaS wizard. Tap-to-cycle settings is denser than a 1–7 stepper; production must keep 44px rows.

**Revision 5 (19 Aug 2026):** gym-only honour is stale. Mixed week + magic-link on You are in the HTML. Screenshots were **not** regenerated.
