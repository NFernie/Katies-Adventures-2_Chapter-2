---
name: BodyPlan
description: Personal gym planner — bumper-plate load on a competition platform
colors:
  platform: "#d4d0c6"
  iron: "#161616"
  iron-2: "#2c2c2c"
  chalk: "#f3f0e8"
  wayfinding: "#efc000"
  live: "#005a70"
  alert: "#b42318"
  done: "#1b6b38"
  steel: "#7a7872"
  hair: "#b9b4a8"
  white: "#f7f5f0"
  plate-breakfast: "#eceae3"
  plate-lunch: "#1e7a3c"
  plate-dinner: "#184a82"
  plate-snack: "#2b2b2b"
  studio: "#2a2926"
  studio-ink: "#e8e4da"
  studio-muted: "#c9c4b8"
  studio-line: "#6a665c"
  bezel: "#1a1917"
  shadow: "rgba(22,22,22,.45)"
  print-shadow: "rgba(22,22,22,.12)"
  scrim: "rgba(22,22,22,.55)"
typography:
  display:
    fontFamily: "Archivo Narrow, Archivo, sans-serif"
    fontSize: "1.85rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  studio-title:
    fontFamily: "Archivo Narrow, Archivo, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
  metric:
    fontFamily: "Archivo Narrow, Archivo, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 700
  title:
    fontFamily: "Archivo, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
  body-sm:
    fontFamily: "Archivo, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  caption:
    fontFamily: "Archivo, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  micro:
    fontFamily: "Archivo, sans-serif"
    fontSize: "11px"
    fontWeight: 600
  label:
    fontFamily: "Archivo, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.04em"
  sheet-title:
    fontFamily: "Archivo Narrow, Archivo, sans-serif"
    fontSize: "1.4rem"
    fontWeight: 700
  split:
    fontFamily: "Archivo Narrow, Archivo, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 700
rounded:
  sm: "4px"
  pill: "999px"
  hub: "50%"
  phone: "36px"
spacing:
  sm: "8px"
  md: "16px"
  quarry: "28px"
components:
  button-wayfinding:
    backgroundColor: "{colors.wayfinding}"
    textColor: "{colors.iron}"
    rounded: "0px"
    height: "52px"
  button-primary:
    backgroundColor: "{colors.iron}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.iron}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "44px"
  plate-hub:
    backgroundColor: "{colors.plate-breakfast}"
    rounded: "{rounded.hub}"
    size: "48px"
---

# Design System: BodyPlan

## Overview

**Creative North Star: "The loaded bar"**

BodyPlan looks like the end of a competition barbell on a pale platform, not a wellness spa and not a dark gym logger. The Owner is under gym lights or at a kitchen counter with a BodyID printout. Light canvas is forced by that scene. Meals are rubber plates you rack; the session is the steel bar.

Numbers (kg, %, kcal, protein) are the loudest layer, in cyan, tabular. Wayfinding yellow exists only on the Continue band. Utility red exists only when a timeline is unsafe.

**Key characteristics:**

- Competition-platform grey, iron type, chalk interiors
- Plate hubs as meal checkboxes (invert when eaten)
- Packed meal modules with stamped end-labels; quarry gap before the lift
- Bottom nav of four: Today · Plan · Log · You
- No login chrome; lock is a note on You

**Reference lock**

| | |
| --- | --- |
| Primary | Bumper-plate load (Impeccable seed `c3180cb2`, assigned index 6) |
| Preserve | Light platform, round hubs, iron bar, monumental kg-style type (Archivo Narrow), slot colours as plates not as UI chrome |
| Borrow | Yellow Continue band (airport wayfinding); cyan live figures (teletext); packed hairline modules (high-density); invert-on-press (HyperCard); SLOT/KCAL/P stamps (end labels) |
| Role rules | Yellow = Continue only. Cyan = live figures only. Red = unsafe speed only. Plate colours = hubs only |
| Media | Code-native plates and printout rules. No photos, no fake food photography |
| Reject | Dark OLED gym apps; indigo; cream-serif editorial; orange energy SaaS; signup funnel; emoji icons |
| Interaction sources | Lifesum: four meal slots always listed. Strong: one exercise at a time, few screens. Hevy: set table + previous column — **not** Hevy’s dark canvas or social feed |

UI/UX Pro Max suggested dark + orange + Barlow Condensed for “fitness.” That is the category rut. This system does not use it.

## Colors

Restrained neutrals plus three named inks.

### Primary
- **Iron** (`#161616`): Type, hairlines, primary solid buttons, selected chips (invert).

### Secondary
- **Wayfinding yellow** (`#efc000`): Continue / Generate band only. Black type on yellow. Never backgrounds, never nav.

### Tertiary
- **Live cyan** (`#005a70`): kg, %, kcal, protein, previous loads. Text on platform ≥4.5:1.

### Neutral
- **Platform** (`#d4d0c6`): App canvas (grey rubber, not ivory cream).
- **Chalk** (`#f3f0e8`): Printout paper and inverted type.
- **White** (`#f7f5f0`): Inputs, nav, modules.
- **Hair** (`#b9b4a8`): Rules inside the printout.
- **Steel** (`#7a7872`): Inactive tabs.

### Semantic
- **Alert** (`#b42318`): Unsafe loss speed banner.
- **Done** (`#1b6b38`): Completed set checks.

### Named rules
**The three-ink rule.** Yellow, cyan, and alert red never share a role. Plate green/blue/black live only on hubs.

## Typography

**Display:** Archivo Narrow (plate stamps, kcal).  
**Body:** Archivo.  
**Character:** Athletic condensed numbers without sports-marketing Barlow; high-legibility body for transcribing a printout.

### Hierarchy
- **Display** (700, 1.85rem, 1.1, -0.03em): Screen titles.
- **Title** (700, 1.05rem): Meal and exercise names.
- **Body** (400, 16px, 1.45): Instructions, disclaimer.
- **Label** (700, 12px, uppercase, 0.04em): End-labels, column headers.
- **Live** (700, tabular-nums, cyan): All measurements.

**The number-loud rule.** If a value can change, it is cyan + tabular-nums.

## Layout

Mobile-first artboards 375 / 390 / 430. Content inset 16px. Bottom nav 64px + safe area; onboarding replaces nav with the yellow band. Packed modules share a 1px iron rule, not card stacks. 28px quarry gap before the workout block. Spacing 8 / 16.

## Elevation & Depth

Mostly flat. Printout uses a 2px × 3px iron-tinted offset (`box-shadow: 2px 3px 0 rgba(22,22,22,.12)`). Swap sheet uses a 55% iron scrim. No glow halos.

## Shapes

4px on buttons, inputs, week cells. Pills for chips. **50% hubs** (plates). Continue band is a rectangle with no radius — a hanging sign, not a pill CTA.

## Components

See `docs/ux/component-inventory.md`. Touch targets ≥44px. Visible 3px iron focus ring. `prefers-reduced-motion` kills animation. Lucide-style 2px square-cap SVGs.

**Lock note:** dashed hairline box, `role="note"`. Not a disabled button.

## Do's and Don'ts

**Do**

- Start onboarding without an account.
- Show four meals and today’s gym session on Today.
- Block only unsafe loss speed; offer the fastest safe date.
- Keep Aceternity to sheet motion, hub pop, Plan bento, optional rest ring.

**Don't**

- Add login, photos, imperial units, or a home-gym track.
- Use yellow anywhere except Continue.
- Default to dark mode or indigo.
- Put emoji in the tab bar.
- Claim medical treatment.
