import Link from "next/link";

import type { MealSlot } from "@/engine";

const hubs: Array<{ slot: MealSlot; label: string; className: string }> = [
  { slot: "breakfast", label: "Breakfast", className: "bg-plate-breakfast" },
  { slot: "lunch", label: "Lunch", className: "bg-plate-lunch" },
  { slot: "dinner", label: "Dinner", className: "bg-plate-dinner" },
  { slot: "snack", label: "Snack", className: "bg-plate-snack" },
];

export function LoadedBar({
  eaten = {
    breakfast: false,
    lunch: false,
    dinner: false,
    snack: false,
  },
  onToggle,
}: {
  eaten?: Record<MealSlot, boolean>;
  onToggle?: (slot: MealSlot) => void;
}) {
  return (
    <div aria-label="Today’s load" className="mb-4 flex items-center gap-2">
      {hubs.map((hub) => {
        const done = eaten[hub.slot];
        const className = `grid size-12 shrink-0 place-items-center rounded-full border-[3px] border-iron ${
          done ? "bg-iron" : hub.className
        }`;
        const inner = (
          <i
            aria-hidden
            className={`block size-3.5 rounded-full border-2 ${
              done ? "border-chalk bg-chalk" : "border-iron bg-platform"
            } ${hub.slot === "snack" && !done ? "bg-steel" : ""}`}
          />
        );
        if (onToggle) {
          return (
            <button
              key={hub.slot}
              type="button"
              aria-pressed={done}
              aria-label={`${hub.label} ${done ? "eaten" : "not eaten"}`}
              className={className}
              onClick={() => onToggle(hub.slot)}
            >
              {inner}
            </button>
          );
        }
        return (
          <span
            key={hub.slot}
            aria-label={`${hub.label} ${done ? "eaten" : "not eaten"}`}
            className={className}
          >
            {inner}
          </span>
        );
      })}
      <Link
        href="/session"
        className="flex min-h-11 min-w-0 flex-1 items-center justify-center border-2 border-iron bg-steel px-2 font-display text-[12px] font-bold tracking-[0.06em] text-chalk uppercase"
      >
        Session
      </Link>
    </div>
  );
}
