import Link from "next/link";

import { Disclaimer } from "@/components/shell/copy";
import { LoadedBar } from "@/components/shell/loaded-bar";
import { PrintoutStrip } from "@/components/shell/printout-strip";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function TodayPage() {
  return (
    <main>
      <p className="font-sans text-[13px] font-semibold text-iron-2">
        No plan yet
      </p>
      <h1 className="mt-1 font-display text-[1.85rem] leading-[1.1] font-bold tracking-[-0.03em]">
        Today
      </h1>
      <PrintoutStrip weight="— kg" bodyFat="— %" smm="— kg" />
      <LoadedBar />
      <section className="border-t border-iron">
        {["Breakfast", "Lunch", "Dinner", "Snack"].map((slot) => (
          <article key={slot} className="border-b border-iron py-3">
            <p className="grid grid-cols-[1fr_auto_auto] gap-2.5 font-sans text-[12px] font-bold tracking-[0.04em] text-iron-2 uppercase">
              <span>{slot}</span>
              <span className="text-live tabular-nums">— kcal</span>
              <span className="text-live tabular-nums">— p</span>
            </p>
            <h2 className="font-sans text-[1.05rem] font-bold">After generate</h2>
            <div className="mt-2 flex gap-2">
              <Button variant="outline" type="button" disabled>
                Swap
              </Button>
              <Button type="button" disabled>
                Ate it
              </Button>
            </div>
          </article>
        ))}
      </section>
      <div className="h-7" aria-hidden />
      <p className="font-sans text-[16px] leading-[1.45]">
        Four meals and today’s gym session will land here. Start without an
        account.
      </p>
      <Link
        href="/onboarding"
        className={cn(buttonVariants(), "mt-4 inline-flex")}
      >
        Start onboarding
      </Link>
      <Disclaimer />
    </main>
  );
}
