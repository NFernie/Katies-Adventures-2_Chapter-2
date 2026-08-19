import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main>
      <h1 className="font-display text-[1.85rem] leading-[1.1] font-bold tracking-[-0.03em]">
        Missing plate
      </h1>
      <p className="mt-2 font-sans text-[16px] leading-[1.45]">
        That route is not in BodyPlan. There is no login screen.
      </p>
      <Link href="/" className={cn(buttonVariants(), "mt-4 inline-flex")}>
        Today
      </Link>
    </main>
  );
}
