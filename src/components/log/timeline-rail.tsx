import type { CheckIn } from "@/data";
import type { RemainingTimeline } from "@/engine";

export function TimelineRail({
  startOn,
  startKg,
  endOn,
  checkIns,
  preview,
}: {
  startOn: string;
  startKg: number | null;
  endOn: string;
  checkIns: CheckIn[];
  preview: RemainingTimeline | null;
}) {
  const projected =
    preview && preview.ok ? preview.projectedEndWeightKg : null;
  const cap = preview && preview.ok ? preview.capPct : preview?.block.capPct;
  const blocked = preview && !preview.ok ? preview.block : null;

  return (
    <section className="mb-4">
      <div
        aria-label="Timeline"
        className="border border-iron bg-chalk px-3 shadow-[2px_3px_0_rgba(22,22,22,0.12)]"
      >
        <TimelineRow
          label={`${formatDate(startOn)} (start)`}
          value={startKg == null ? "— kg" : `${startKg} kg`}
        />
        {checkIns.map((row) => (
          <TimelineRow
            key={row.id}
            label={formatDate(row.loggedOn)}
            value={`${row.weightKg} kg`}
          />
        ))}
        <TimelineRow
          label={`Projected ${formatDate(endOn)}`}
          value={projected == null ? "— kg" : `${projected} kg`}
        />
        <TimelineRow
          label="Cap"
          value={cap == null ? "1.0 % / week" : `${cap.toFixed(1)} % / week`}
        />
      </div>
      {blocked ? (
        <p role="alert" className="mt-3 font-sans text-[16px] leading-[1.45] text-alert">
          Remaining pace is over the cap. Fastest safe date{" "}
          {formatDate(blocked.fastestSafeEndOn)}.
        </p>
      ) : null}
    </section>
  );
}

function TimelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-hair py-2.5 last:border-b-0">
      <span className="font-sans text-[13px] font-semibold text-iron">{label}</span>
      <span className="font-display text-[1.15rem] font-bold text-live tabular-nums">
        {value}
      </span>
    </div>
  );
}

function formatDate(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[Number(match[2]) - 1] ?? match[2];
  return `${Number(match[3])} ${month}`;
}
