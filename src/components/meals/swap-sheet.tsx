"use client";

import { useSheetFocus } from "@/components/shell/use-sheet-focus";
import type { CatalogRecipe, MealSlot } from "@/engine";

const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export function SwapSheet({
  slot,
  open,
  candidates,
  emptyReason,
  onPick,
  onClose,
}: {
  slot: MealSlot;
  open: boolean;
  candidates: CatalogRecipe[];
  emptyReason: string;
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
        aria-labelledby="swap-title"
        className="absolute inset-x-0 bottom-0 mx-auto max-w-[430px] border-t border-iron bg-chalk px-4 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]"
      >
        <h2 id="swap-title" className="font-display text-[1.4rem] font-bold">
          Swap {SLOT_LABEL[slot]}
        </h2>
        <p className="mt-1 font-sans text-[14px] leading-snug text-iron-2">
          Same slot · ±10% kcal · ±20% protein.
        </p>
        {candidates.length === 0 ? (
          <p className="mt-4 font-sans text-[16px] leading-[1.45] text-iron-2">
            {emptyReason}
          </p>
        ) : (
          <ul className="mt-3">
            {candidates.map((recipe) => (
              <li key={recipe.slug} className="border-b border-hair">
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center justify-between py-2 text-left"
                  onClick={() => onPick(recipe.slug)}
                >
                  <strong className="font-sans text-[1.05rem]">{recipe.title}</strong>
                  <small className="font-sans text-[14px] text-live tabular-nums">
                    {Math.round(recipe.nutrition.kcal)} kcal ·{" "}
                    {Math.round(recipe.nutrition.proteinG)} g
                  </small>
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
