import { LockNote } from "@/components/shell/copy";

export const metadata = { title: "You" };

export default function SettingsPage() {
  return (
    <main>
      <p className="font-sans text-[13px] font-semibold text-iron-2">
        Profile · metric
      </p>
      <h1 className="mt-1 font-display text-[1.85rem] leading-[1.1] font-bold tracking-[-0.03em]">
        You
      </h1>
      <p className="mt-3 font-sans text-[16px] leading-[1.45]">
        Height, weight, and BodyID fields save here in Phase 4. There is no
        login wall.
      </p>
      <LockNote />
    </main>
  );
}
