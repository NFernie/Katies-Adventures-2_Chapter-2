"use client";

import { useSheetFocus } from "@/components/shell/use-sheet-focus";
import type { CatalogExercise } from "@/engine";

export function SwapLiftSheet({
  open,
  setting,
  candidates,
  onPick,
  onClose,
}: {
  open: boolean;
  setting: string;
  candidates: CatalogExercise[];
  onPick: (slug: string) => void;
  onClose: () => void;
}) {
  const panelRef = useSheetFocus(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-20">
      <button
        type="button"
        aria-label="Close swap sheet"
        className="absolute inset-0 bg-scrim"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="swap-lift-title"
        className="absolute inset-x-0 bottom-0 mx-auto max-w-[430px] border-t border-iron bg-chalk px-4 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]"
      >
        <h2 id="swap-lift-title" className="font-display text-[1.4rem] font-bold">
          Swap lift
        </h2>
        <p className="mt-1 font-sans text-[14px] leading-snug text-iron-2">
          Same movement · {setting} only. Text cues, no video.
        </p>
        {candidates.length === 0 ? (
          <p className="mt-4 font-sans text-[16px] leading-[1.45] text-iron-2">
            No in-setting swap for this pattern.
          </p>
        ) : (
          <ul className="mt-3">
            {candidates.map((exercise) => (
              <li key={exercise.slug} className="border-b border-hair">
                <button
                  type="button"
                  className="flex min-h-11 w-full flex-col items-start py-2 text-left"
                  onClick={() => onPick(exercise.slug)}
                >
                  <strong className="font-sans text-[1.05rem]">{exercise.title}</strong>
                  <span className="font-sans text-[14px] text-iron-2">{exercise.cue}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="mt-4 min-h-11 font-sans text-[14px] font-semibold"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
