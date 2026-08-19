import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WorkoutModule({
  title,
  setting,
  moveCount,
  deload,
  empty,
}: {
  title: string;
  setting: string;
  moveCount: number;
  deload: boolean;
  empty: boolean;
}) {
  return (
    <article className="border-t border-b border-iron py-3">
      <p className="mb-1 grid grid-cols-[1fr_auto_auto] gap-2.5 font-sans text-[12px] font-bold tracking-[0.04em] text-iron-2 uppercase">
        <span>Session</span>
        <span className="tabular-nums">{empty ? "Rest" : `${moveCount} moves`}</span>
        <span>{setting}</span>
      </p>
      <h2 className="mb-2 font-sans text-[1.05rem] font-bold">{title}</h2>
      {deload ? (
        <p className="mb-2 font-sans text-[14px] text-iron-2">
          Deload week. Planned sets × 0.6. Same movements as any other week.
        </p>
      ) : null}
      {empty ? (
        <p className="font-sans text-[16px] leading-[1.45] text-iron-2">
          No lifts today. Cardio is chosen by the generator, not as an onboarding
          pick.
        </p>
      ) : (
        <Link href="/session" className={cn(buttonVariants(), "inline-flex")}>
          Start workout
        </Link>
      )}
    </article>
  );
}
