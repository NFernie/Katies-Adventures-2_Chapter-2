import type { TrainingDay, Weekday } from "@/data";

const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const SHORT: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
  gym: "gym",
  home: "home",
  bands: "bands",
  bodyweight: "BW",
  rest: "rest",
};

export function WeekStrip({ days }: { days: TrainingDay[] }) {
  const byWeekday = new Map(days.map((day) => [day.weekday, day.setting]));
  return (
    <div className="mt-4">
      <p className="mb-2 font-sans text-[13px] font-semibold text-iron-2">This week</p>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((weekday) => {
          const setting = byWeekday.get(weekday) ?? "rest";
          const train = setting !== "rest";
          return (
            <div
              key={weekday}
              className={`rounded-[4px] border border-iron px-0.5 py-2 text-center ${
                train ? "bg-iron text-chalk" : "bg-white text-iron"
              }`}
            >
              <p className="font-sans text-[11px] font-bold tracking-[0.04em] uppercase">
                {SHORT[weekday]}
              </p>
              <p className="font-sans text-[11px] font-semibold">{SHORT[setting]}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
