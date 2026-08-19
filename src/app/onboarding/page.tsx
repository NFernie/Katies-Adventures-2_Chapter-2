import { Disclaimer } from "@/components/shell/copy";

export const metadata = { title: "Onboarding" };

const chips = [
  ["Female", true],
  ["Male", false],
] as const;

export default function OnboardingPage() {
  return (
    <main>
      <p className="font-sans text-[13px] font-semibold text-iron-2">1 of 5</p>
      <h1 className="mt-1 font-display text-[1.85rem] leading-[1.1] font-bold tracking-[-0.03em]">
        You
      </h1>
      <p className="mt-2 font-sans text-[16px] leading-[1.45] text-iron-2">
        Male or female for Mifflin–St Jeor. Metric only.
      </p>
      <div className="mt-4">
        <p className="mb-1.5 font-sans text-[14px] font-semibold text-iron-2">
          Sex
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Sex">
          {chips.map(([label, pressed]) => (
            <button
              key={label}
              type="button"
              aria-pressed={pressed}
              className={`min-h-11 rounded-full border-[1.5px] border-iron px-3.5 font-semibold ${
                pressed ? "bg-iron text-chalk" : "bg-transparent text-iron"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <label className="mt-4 block font-sans text-[14px] font-semibold">
        Age (years)
        <input
          className="mt-1.5 min-h-12 w-full rounded-[4px] border border-iron bg-white px-3 font-sans text-[1.15rem] font-semibold text-live tabular-nums"
          inputMode="numeric"
          defaultValue="36"
        />
      </label>
      <label className="mt-4 block font-sans text-[14px] font-semibold">
        Height (cm)
        <input
          className="mt-1.5 min-h-12 w-full rounded-[4px] border border-iron bg-white px-3 font-sans text-[1.15rem] font-semibold text-live tabular-nums"
          inputMode="decimal"
          defaultValue="178"
        />
      </label>
      <p className="mt-4 font-sans text-[16px] leading-[1.45] text-iron-2">
        InBody / Tanita (BodyID). Type the printout. No photos. Saving the
        profile needs a magic-link session (Phase 4).
      </p>
      <Disclaimer />
    </main>
  );
}
