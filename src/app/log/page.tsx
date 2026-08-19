import { PrintoutStrip } from "@/components/shell/printout-strip";

export const metadata = { title: "Log" };

export default function LogPage() {
  return (
    <main>
      <p className="font-sans text-[13px] font-semibold text-iron-2">
        Weight + BodyID fields. No photos.
      </p>
      <h1 className="mt-1 font-display text-[1.85rem] leading-[1.1] font-bold tracking-[-0.03em]">
        Log
      </h1>
      <PrintoutStrip weight="— kg" bodyFat="— %" smm="— kg" />
      <p className="font-sans text-[16px] leading-[1.45]">
        Check-ins reuse the same InBody / Tanita family as onboarding. Photos
        are out of v1.
      </p>
    </main>
  );
}
