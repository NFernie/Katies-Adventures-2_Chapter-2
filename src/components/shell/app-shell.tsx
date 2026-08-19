"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { BottomNav } from "@/components/shell/bottom-nav";
import { WayfindingBand } from "@/components/shell/wayfinding-band";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const onboarding = pathname.replace(/\/$/, "").endsWith("onboarding");

  return (
    <div className="relative mx-auto min-h-svh w-full max-w-[430px] bg-platform text-iron">
      <div
        className={
          onboarding
            ? "min-h-svh px-4 pt-4 pb-[calc(68px+env(safe-area-inset-bottom))]"
            : "min-h-svh px-4 pt-4 pb-[calc(80px+env(safe-area-inset-bottom))]"
        }
      >
        {children}
      </div>
      {onboarding ? (
        <WayfindingBand href="/">Continue</WayfindingBand>
      ) : (
        <BottomNav />
      )}
    </div>
  );
}
