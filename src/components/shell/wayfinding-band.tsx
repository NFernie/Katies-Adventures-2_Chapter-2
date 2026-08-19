"use client";

import Link from "next/link";

const bandClass =
  "fixed bottom-0 left-1/2 z-10 flex h-[calc(52px+env(safe-area-inset-bottom))] w-full max-w-[430px] -translate-x-1/2 items-center justify-center bg-wayfinding pb-[env(safe-area-inset-bottom)] font-display text-[1.15rem] font-bold tracking-[0.04em] text-iron uppercase disabled:opacity-50";

export function WayfindingBand({
  href,
  onClick,
  disabled,
  children,
}: {
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  children: string;
}) {
  if (href) {
    return (
      <Link href={href} className={bandClass}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={bandClass}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
