# Component inventory (v1)

Prototype source: `docs/ux/prototype/index.html`. Production maps these to shadcn primitives + at most **four to six** Aceternity pieces (Plan bento, swap sheet motion, checkbox pop). Aceternity is seasoning, not every card.

| Component | Job | Notes |
| --- | --- | --- |
| **PhoneShell** | 375 / 390 / 430 artboard | Safe-area padding; bottom nav clearance |
| **WayfindingBand** | Primary continue / next | Schiphol-yellow strip, black type, full width, 48px min height. Yellow is **only** this role |
| **ProgressCount** | “2 of 5” | Sequence information; not decorative 01/02 |
| **ChoiceChip** | Goal type, diet/kitchen flags, sex | 44×44 min; selected = iron invert (HyperCard press) |
| **WeekdaySettingRow** | One weekday’s setting | Cycles Rest → Gym → Home → Bands → Bodyweight. 44px. Train days invert iron; rest stays outlined. Not a 1–7 gym stepper |
| **NumberField** | kg, cm, %, years | Visible `<label>`, `inputmode="decimal"` or `numeric`, tabular-nums, cyan value colour |
| **PrintoutStrip** | BodyID snapshot | Hairline rules; weight / BF% / SMM; not a photo |
| **LoadedBar** | Today’s load at a glance | Four plate hubs + iron bar; hubs are the meal checkboxes |
| **PlateHub** | Check a meal | Rubber disc + centre hole; invert when eaten. Not a coloured left border |
| **MealModule** | Slot detail | End-label: slot / kcal / protein; Swap + Ate it. Packed, hairline, no nested cards |
| **SwapSheet** | Three alternatives | Bottom sheet; radio rows; confirm on tap; focus trap; 44px rows. Lifts filtered by **that day’s setting** |
| **SetTable** | Live session | Set / kg / Reps / ✓ ; tabular-nums; done wash (not rainbow) |
| **WeekStrip** | 7 days | Each cell shows weekday + setting (or rest). Filled = train day. Tap → that day |
| **TimelineRail** | Projected vs check-ins | Numbers + dates; no body photos |
| **BottomNav** | Today · Plan · Log · You | Four items; 44px; active = iron, not yellow |
| **MagicLinkField** | Phase 4 sign-in | Email + iron Send. `/lock` check-email. Must not look like a disabled button |
| **Disclaimer** | Review + footer | Not medical treatment; 18+ |
| **UnsafeBanner** | Timeline intercept | Utility red; names fastest safe date |

## Iconography

Lucide-style 24px outline SVGs, 2px stroke, one family. No emoji-as-icon.

## Aceternity (cap)

1. Swap sheet enter/exit.  
2. Plate-hub check pop.  
3. Plan page bento (kcal / protein / weeks).  
4. Optional rest-timer ring on Session.

Skip: 3D, meteors, ever-present sparkles, login aurora.
