"use client";

import { Button } from "@/components/ui/button";
import type { CatalogIngredient, MealSlot } from "@/engine";

const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export function MealCard({
  slot,
  title,
  kcal,
  proteinG,
  eaten,
  pinned,
  canSwap,
  canAct,
  ingredients,
  steps,
  servingsScale,
  onSwap,
  onAte,
  onPin,
}: {
  slot: MealSlot;
  title: string;
  kcal: number | null;
  proteinG: number | null;
  eaten: boolean;
  pinned: boolean;
  canSwap: boolean;
  canAct: boolean;
  ingredients?: CatalogIngredient[];
  steps?: string[];
  servingsScale?: number;
  onSwap: () => void;
  onAte: () => void;
  onPin: () => void;
}) {
  const scale = servingsScale && servingsScale > 0 ? servingsScale : 1;
  const hasRecipe = (ingredients && ingredients.length > 0) || (steps && steps.length > 0);

  return (
    <article className="border-b border-iron py-3">
      <p className="mb-1 grid grid-cols-[1fr_auto_auto] gap-2.5 font-sans text-[12px] font-bold tracking-[0.04em] text-iron-2 uppercase">
        <span>{SLOT_LABEL[slot]}</span>
        <span className="text-live tabular-nums">
          {kcal == null ? "— kcal" : `${Math.round(kcal)} kcal`}
        </span>
        <span className="text-live tabular-nums">
          {proteinG == null ? "— g P" : `${Math.round(proteinG)} g P`}
        </span>
      </p>
      <h2 className="mb-2 font-sans text-[1.05rem] font-bold">{title}</h2>
      {hasRecipe ? (
        <details className="mb-2">
          <summary className="min-h-11 cursor-pointer font-sans text-[14px] font-semibold">
            Recipe
          </summary>
          {ingredients && ingredients.length > 0 ? (
            <ul className="mt-2 font-sans text-[16px] leading-[1.45] text-iron-2">
              {ingredients.map((ingredient) => {
                const grams = Math.round(ingredient.grams * scale);
                return (
                  <li key={`${ingredient.name}-${grams}`}>
                    {grams} g {ingredient.name}
                    {scale === 1 && ingredient.household
                      ? ` (${ingredient.household})`
                      : ""}
                  </li>
                );
              })}
            </ul>
          ) : null}
          {steps && steps.length > 0 ? (
            <ol className="mt-2 list-decimal pl-5 font-sans text-[16px] leading-[1.45] text-iron-2">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          ) : null}
        </details>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" type="button" disabled={!canSwap} onClick={onSwap}>
          Swap
        </Button>
        <Button type="button" disabled={!canAct} aria-pressed={eaten} onClick={onAte}>
          {eaten ? "Eaten" : "Ate it"}
        </Button>
        <Button
          variant="outline"
          type="button"
          disabled={!canAct}
          aria-pressed={pinned}
          onClick={onPin}
        >
          {pinned ? "Pinned" : "Pin"}
        </Button>
      </div>
    </article>
  );
}
