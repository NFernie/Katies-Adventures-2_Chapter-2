"use client";

import type { WorkoutSetRow } from "@/data";

export function SetTable({
  sets,
  onChange,
}: {
  sets: WorkoutSetRow[];
  onChange: (next: WorkoutSetRow[]) => void;
}) {
  function patch(index: number, part: Partial<WorkoutSetRow>) {
    onChange(sets.map((row, i) => (i === index ? { ...row, ...part } : row)));
  }

  return (
    <table className="mt-4 w-full border-collapse text-left">
      <thead>
        <tr className="font-sans text-[12px] font-bold tracking-[0.04em] text-iron-2 uppercase">
          <th className="pb-2 font-bold">Set</th>
          <th className="pb-2 font-bold">Prev</th>
          <th className="pb-2 font-bold">kg</th>
          <th className="pb-2 font-bold">Reps</th>
          <th className="pb-2 font-bold">Done</th>
        </tr>
      </thead>
      <tbody>
        {sets.map((row, index) => (
          <tr key={row.n} className="border-t border-hair">
            <td className="py-2 font-sans text-[16px] font-semibold tabular-nums">
              {row.n}
            </td>
            <td className="py-2 font-sans text-[14px] text-live tabular-nums">—</td>
            <td className="py-2 pr-2">
              <input
                inputMode="decimal"
                aria-label={`Set ${row.n} kg`}
                value={row.kg ?? ""}
                onChange={(event) => {
                  const raw = event.target.value;
                  const value = Number(raw);
                  patch(index, { kg: raw === "" || !Number.isFinite(value) ? null : value });
                }}
                className="h-11 w-[4.5rem] border border-iron bg-white px-2 font-sans text-[1.15rem] font-semibold text-live tabular-nums"
              />
            </td>
            <td className="py-2 pr-2">
              <input
                inputMode="numeric"
                aria-label={`Set ${row.n} reps`}
                value={row.reps ?? ""}
                onChange={(event) => {
                  const raw = event.target.value;
                  const value = Number(raw);
                  patch(index, {
                    reps: raw === "" || !Number.isFinite(value) ? null : value,
                  });
                }}
                className="h-11 w-[4.5rem] border border-iron bg-white px-2 font-sans text-[1.15rem] font-semibold text-live tabular-nums"
              />
            </td>
            <td className="py-2">
              <button
                type="button"
                aria-pressed={row.done}
                aria-label={`Mark set ${row.n} ${row.done ? "not done" : "done"}`}
                onClick={() => patch(index, { done: !row.done })}
                className={`grid size-11 place-items-center border-2 border-iron ${
                  row.done ? "bg-done" : "bg-white"
                }`}
              >
                <span
                  aria-hidden
                  className={`block size-3.5 ${row.done ? "bg-chalk" : "bg-transparent"}`}
                />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
