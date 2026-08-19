import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function BentoGrid({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>{children}</div>
  );
}

export function BentoGridItem({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: ReactNode;
  description?: ReactNode;
  header?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between border border-iron bg-white p-3",
        className,
      )}
    >
      {header}
      <div>
        {icon}
        <p className="font-sans text-[12px] font-bold tracking-[0.04em] text-iron-2 uppercase">
          {title}
        </p>
        <div className="font-display text-[1.6rem] leading-none font-bold text-live tabular-nums">
          {description}
        </div>
      </div>
    </div>
  );
}
