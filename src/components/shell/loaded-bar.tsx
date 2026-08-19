import Link from "next/link";

const hubs = [
  { slot: "breakfast", label: "Breakfast not eaten", className: "bg-plate-breakfast" },
  { slot: "lunch", label: "Lunch not eaten", className: "bg-plate-lunch" },
  { slot: "dinner", label: "Dinner not eaten", className: "bg-plate-dinner" },
  { slot: "snack", label: "Snack not eaten", className: "bg-plate-snack" },
] as const;

export function LoadedBar() {
  return (
    <div
      aria-label="Today’s load"
      className="mb-4 flex items-center gap-2"
    >
      {hubs.map((hub) => (
        <span
          key={hub.slot}
          aria-label={hub.label}
          className={`grid size-12 shrink-0 place-items-center rounded-full border-[3px] border-iron ${hub.className}`}
        >
          <i
            aria-hidden
            className={`block size-3.5 rounded-full border-2 border-iron ${
              hub.slot === "snack" ? "bg-steel" : "bg-platform"
            }`}
          />
        </span>
      ))}
      <Link
        href="/plan"
        className="flex min-h-11 min-w-0 flex-1 items-center justify-center border-2 border-iron bg-steel px-2 font-display text-[12px] font-bold tracking-[0.06em] text-chalk uppercase"
      >
        Gym session
      </Link>
    </div>
  );
}
