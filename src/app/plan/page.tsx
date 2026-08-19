import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";

export const metadata = { title: "Plan" };

export default function PlanPage() {
  return (
    <main>
      <p className="font-sans text-[13px] font-semibold text-iron-2">
        Placeholder · gym days user-selected later
      </p>
      <h1 className="mt-1 font-display text-[1.85rem] leading-[1.1] font-bold tracking-[-0.03em]">
        Plan
      </h1>
      <BentoGrid className="mt-4">
        <BentoGridItem title="Energy" description="— kcal" />
        <BentoGridItem title="Protein" description="— g" />
        <BentoGridItem
          className="col-span-2"
          title="Weeks"
          description="—"
        />
      </BentoGrid>
      <p className="mt-4 font-sans text-[16px] leading-[1.45]">
        Cardio is chosen by the generator for the goal. Same gym menu for male
        and female. Unsafe speed is the only block.
      </p>
    </main>
  );
}
