"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, House, User } from "lucide-react";

const items = [
  { href: "/", label: "Today", icon: House },
  { href: "/plan", label: "Plan", icon: CalendarDays },
  { href: "/log", label: "Log", icon: ClipboardList },
  { href: "/settings", label: "You", icon: User },
] as const;

function norm(path: string) {
  const trimmed = path.replace(/\/$/, "");
  return trimmed.length === 0 ? "/" : trimmed;
}

export function BottomNav() {
  const pathname = usePathname() ?? "/";
  const current = norm(pathname);

  return (
    <nav
      aria-label="Primary"
      className="absolute inset-x-0 bottom-0 grid h-[calc(64px+env(safe-area-inset-bottom))] grid-cols-4 border-t border-iron bg-white pb-[env(safe-area-inset-bottom)]"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/"
            ? current === "/" || current === "/session"
            : current === norm(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex min-h-11 flex-col items-center justify-center gap-0.5 font-sans text-[11px] font-semibold tracking-[0.04em] uppercase ${
              active ? "text-iron" : "text-steel"
            }`}
            aria-current={active ? "page" : undefined}
          >
            <Icon aria-hidden className="size-5 stroke-[2]" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
