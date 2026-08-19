"use client";

import { useEffect, useState } from "react";

import { useAuthSession } from "@/components/auth/use-auth-session";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { listPlanVersions, type PlanVersion } from "@/data";

export function PlanScreen() {
  const { status } = useAuthSession();
  const [version, setVersion] = useState<PlanVersion | null>(null);

  useEffect(() => {
    if (status !== "signed-in") return;
    let cancelled = false;
    void listPlanVersions()
      .then((rows) => {
        if (!cancelled) setVersion(rows[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setVersion(null);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const shown = status === "signed-in" ? version : null;

  return (
    <main>
      <p className="font-sans text-[13px] font-semibold text-iron-2">
        Current plan
      </p>
      <h1 className="mt-1 font-display text-[1.85rem] leading-[1.1] font-bold tracking-[-0.03em]">
        Plan
      </h1>
      <BentoGrid className="mt-4">
        <BentoGridItem
          title="Energy"
          description={shown ? `${shown.energyKcal} kcal` : "— kcal"}
        />
        <BentoGridItem
          title="Protein"
          description={shown ? `${shown.proteinG} g` : "— g"}
        />
        <BentoGridItem
          className="col-span-2"
          title="Split"
          description={shown ? shown.splitId.split("_").join(" ") : "—"}
        />
      </BentoGrid>
      <p className="mt-4 font-sans text-[16px] leading-[1.45]">
        Cardio is chosen by the generator for the goal. Same movement rules for
        male and female. Each session uses that day’s setting. Unsafe speed is
        the only block.
      </p>
    </main>
  );
}
