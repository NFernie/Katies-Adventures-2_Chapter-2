---
target: src/components/onboarding/onboarding-flow.tsx
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-08-19T05-10-44Z
slug: src-components-onboarding-onboarding-flow-tsx
---
Method: dual-agent (A: bc-2988cf13-779c-5710-a153-b98ffe1659fb · B: bc-da2a8dc6-2fdb-5aeb-a6c0-d8e206d53542)

# Critique: onboarding-flow.tsx

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | “n of 5”, Saving…, train-day count; no live energy until review |
| 2 | Match System / Real World | 3 | InBody/kg/week map land; PAL / Mifflin / “magic-link session” leak |
| 3 | User Control and Freedom | 2 | Back from 2–5 only; week cycles forward-only; no exit on You |
| 4 | Consistency and Standards | 3 | Ink roles hold; step 2 isn’t the chalk printout step 5 is |
| 5 | Error Prevention | 2 | Prefilled synthetic numbers; Number("")→0; vegan+vegetarian both on |
| 6 | Recognition Rather Than Recall | 2 | Week is a 5-state cycle to memorize; review hides transcribed kg/%/SMM |
| 7 | Flexibility and Efficiency | 2 | Forced 5 taps; no skip/jump; 7× cycle vs a setting picker |
| 8 | Aesthetic and Minimalist Design | 3 | Loaded-bar identity; step 4/5 dump competing blocks |
| 9 | Error Recovery | 3 | Unsafe date names fastest-safe; Generate errors are plain |
| 10 | Help and Documentation | 2 | Captions exist; SMM / Mifflin unexplained |
| **Total** | | **26/40** | **Acceptable** |

## Design Specificity Verdict

**Start here.** Authored for BodyPlan, not a wellness SaaS funnel. Platform canvas, Archivo Narrow titles, cyan tabular BodyID fields, iron invert chips, chalk review sheet, yellow only on the Continue band, red only on the 1% loss-speed block, mixed-week map, magic link on review.

**LLM assessment:** Category-interchangeable leftovers: chip walls, generic NumberFields on step 2 (no printout paper), designer-voice “Not a second account funnel.”

**Deterministic scan:** `detect.mjs --json` on onboarding-flow.tsx, wayfinding-band.tsx, magic-link-form.tsx, copy.tsx → exit 0, `[]`. Zero rule hits. Misses, not false positives: CLI never saw computed geometry/color.

**Visual overlays:** Mutation probe succeeded. No detect.js inject, no presented [Human] tab. **no reliable user-visible overlay; fallback signal: CLI-only.** Playwright 375×812 walk completed (steps 1–5, unsafe date, signed-out Generate).

## Overall Impression

The three-ink rule and mixed week are the product. The biggest hole is the signed-out Generate path: magic link default-redirects to `/lock` and the draft is React state only, so the plan evaporates. Kitchen/week is a wall. Unsafe-speed recovery is the high-stakes moment done right (red, not yellow).

## What's Working

1. Three-ink rule held: yellow hanging-sign Continue (`button`, `fixed`, `max-w-[430px]`), cyan live figures, red unsafe-only (`#b42318`, not wayfinding).
2. Mixed week is a real weekday map, not “days/week.” PAL copy names the count rule.
3. Unsafe speed stays on Aim and offers the fastest safe date; Generate is commit, not signup. No nested forms. Disclaimer on review. No horizontal overflow at 375.

## Priority Issues

**[P0] Magic link leaves the flow**
- **What:** Review uses `<MagicLinkForm />` (`redirectOnSend` defaults true → `/lock`). Draft is React state only. Email redirect is `/lock/`.
- **Why it matters:** Signed-out Generate is the persistence path; the plan evaporates.
- **Fix:** `redirectOnSend={false}`; persist draft; `emailRedirectTo` onboarding; sent confirmation in place.
- **Suggested command:** /impeccable harden

**[P1] Kitchen is a wall**
- **What:** Step 4: 6 diet chips, 3 kitchen, servings, 7-day tap-cycle. Diet union also missing shellfish/egg/soy.
- **Why it matters:** Flows promised one decision/screen; missing allergy flags cannot be persisted.
- **Fix:** Group diet vs allergies (complete DietFlag set); keep 5 steps.
- **Suggested command:** /impeccable distill

**[P1] Synthetic defaults look like the Owner**
- **What:** `initialDraft` seeds 165 cm / 72 kg / 28% / vegetarian / mixed week.
- **Why it matters:** First-timer Continue-spams a sample printout into a real plan.
- **Fix:** Caption: sample figures — replace with your printout.
- **Suggested command:** /impeccable clarify

**[P2] Printout step isn’t a printout**
- **What:** Step 2 = three NumberFields; chalk/hair/shadow only on review.
- **Why it matters:** Misses the BodyID transcription scene DESIGN locked.
- **Fix:** Wrap kg / BF% / SMM in the chalk sheet; stamp machine labels.
- **Suggested command:** /impeccable layout

**[P2] Week cycle is slow and opaque; Back is 33px wide; alert contrast 4.27:1**
- **What:** Forward-only 5-state cycle; Back `min-h-11` without min-width; `#b42318` on `#d4d0c6` fails AA.
- **Why it matters:** 44px width, WCAG 4.5:1, weekday name not on the control.
- **Fix:** `min-w-11` Back; chalk behind alert (5.77:1); aria-label weekday + setting.
- **Suggested command:** /impeccable audit

## Persona Red Flags

**Jordan (first-timer with an InBody printout):** Birth-date vs flows “age (years)”; SMM unexplained; defaults already filled; Mifflin jargon; diet 6-way; magic-link copy talks to the design system; Back undersized; red alert contrast fails.

**Alex (experienced lifter):** Unskippable 5 steps; 7 forward-only cycles; Generate blocked until email; placeholder USDA copy; no jump-to-review.

## Minor Observations

- No nested forms (signed-out magic link is a single top-level form).
- Labels present: htmlFor on dates/numbers; groups have aria-label; chips aria-pressed.
- Weekday cycle buttons expose only setting name until aria-label is added.
- Chip/band 44px height OK. Band measured 375×52.
- Step 5 energy was 1690 kcal in the +14d walk (expected: blocked or after using safe date — walk used a later date than the 14-day block in one shot).

## Questions to Consider

- If the Owner already holds the printout, why isn’t step 2 the sheet?
- Why is the week a cycle instead of a rack of five settings?
- Should Generate wait for mail, or queue the plan and unlock when the link returns?
