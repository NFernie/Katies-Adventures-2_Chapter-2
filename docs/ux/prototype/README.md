# Where to see the screen prototypes

The clickable prototype is a single HTML file. There is no Next.js app yet.

## Open it

1. On your machine: open

   `docs/ux/prototype/index.html`

   in Chrome or Safari (double-click, or drag onto a browser window).

2. Or from the repo root:

   ```bash
   python3 -m http.server 4173 --directory docs/ux/prototype
   ```

   then visit `http://localhost:4173/`

Direct screen URLs (after serving): `#on1` You · `#on2` Printout · `#on3` Aim · `#on4` Kitchen · `#on5` Review · `#today` · `#swap` · `#session` · `#plan` · `#log` · `#you`.

## What to click

| Screen | How |
| --- | --- |
| Onboarding (5 steps) | Starts here. Yellow **Continue** band. Back on steps 2–5. |
| Unsafe speed | On **Aim**, set the date to **1 Sep 2026**. |
| Today | Finish **Generate my plan**. |
| Swap | On Today, tap **Swap** on a meal. |
| Session | Tap the steel bar or **Start workout**. |
| Plan / Timeline / You | Bottom nav: Plan, Log, You. |
| Widths | 375 / 390 / 430 buttons above the phone. |

Settings (**You**) has a dashed **note**, not a button: locking with email comes later.

## Stills

Captures at 390px (prototype chrome + phone):

- `screenshots/on1.png` — onboarding You
- `screenshots/today.png` — Today (printout, plate hubs, meals)
- `screenshots/swap.png` — swap sheet
- `screenshots/session.png` — one-exercise set table
- `screenshots/plan.png` — plan + week strip
- `screenshots/you.png` — profile + lock note (not a button)

The HTML is the source of truth. Click through `#on1` → `#on5` for the full onboarding. Helper copy uses **iron-2** `#1a1a1a` (DESIGN.md). The PNG stills were captured before that contrast tweak; they are not regenerated.
