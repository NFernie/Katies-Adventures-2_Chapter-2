"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { BottomNav } from "@/components/shell/bottom-nav";
import { Disclaimer } from "@/components/shell/copy";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const onboarding = pathname.replace(/\/$/, "").endsWith("onboarding");

  return (
    <div className="relative mx-auto min-h-svh w-full max-w-[430px] bg-platform text-iron">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:bg-white focus:px-3 focus:font-sans focus:text-[14px] focus:font-semibold"
      >
        Skip to main content
      </a>
      <div
        id="main"
        tabIndex={-1}
        className={
          onboarding
            ? "min-h-svh px-4 pt-4 pb-[calc(68px+env(safe-area-inset-bottom))]"
            : "min-h-svh px-4 pt-4 pb-[calc(80px+env(safe-area-inset-bottom))]"
        }
      >
        {children}
        {onboarding ? null : (
          <footer>
            <Disclaimer />
          </footer>
        )}
      </div>
      {onboarding ? null : <BottomNav />}
    </div>
  );
}
