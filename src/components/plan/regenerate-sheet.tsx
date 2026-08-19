"use client";

export function RegenerateSheet({
  open,
  onConfirm,
  onClose,
}: {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-20">
      <button
        type="button"
        aria-label="Close regenerate sheet"
        className="absolute inset-0 bg-scrim"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="regen-title"
        className="absolute inset-x-0 bottom-0 mx-auto max-w-[430px] border-t border-iron bg-chalk px-4 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]"
      >
        <h2 id="regen-title" className="font-display text-[1.4rem] font-bold">
          New plan version
        </h2>
        <p className="mt-2 font-sans text-[16px] leading-[1.45] text-iron-2">
          Old weeks stay readable. Pinned meals stay. This does not delete
          history.
        </p>
        <button
          type="button"
          className="mt-4 flex min-h-11 w-full items-center justify-center rounded-[4px] bg-iron font-sans text-[14px] font-semibold text-chalk"
          onClick={onConfirm}
        >
          Continue to onboarding
        </button>
        <button
          type="button"
          className="mt-2 min-h-11 w-full font-sans text-[14px] font-semibold"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
