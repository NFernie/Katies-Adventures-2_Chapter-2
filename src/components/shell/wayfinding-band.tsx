import Link from "next/link";

export function WayfindingBand({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <Link
      href={href}
      className="absolute inset-x-0 bottom-0 flex h-[calc(52px+env(safe-area-inset-bottom))] items-center justify-center bg-wayfinding pb-[env(safe-area-inset-bottom)] font-display text-[1.15rem] font-bold tracking-[0.04em] text-iron uppercase"
    >
      {children}
    </Link>
  );
}
