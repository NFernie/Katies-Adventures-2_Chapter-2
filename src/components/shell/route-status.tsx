import type { ReactNode } from "react";

export type RouteLoadState = "loading" | "ready" | "error";

export function RouteStatus({
  loading,
  error,
  onRetry,
  loadingLabel = "Loading…",
}: {
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  loadingLabel?: string;
}) {
  if (loading) {
    return (
      <p
        role="status"
        aria-busy="true"
        className="mt-3 font-sans text-[16px] leading-[1.45] text-iron-2"
      >
        {loadingLabel}
      </p>
    );
  }
  if (!error) return null;
  return (
    <div role="alert" className="mt-3 border border-alert px-3 py-3">
      <p className="font-sans text-[16px] leading-[1.45]">
        Could not load this screen. Check the connection, then try again.
      </p>
      {onRetry ? (
        <button
          type="button"
          className="mt-2 min-h-11 font-sans text-[14px] font-semibold text-live"
          onClick={onRetry}
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

/** Initial load only. Parents keep refetch silent so this does not flash. */
export function RouteGate({
  loadState,
  onRetry,
  children,
  loadingLabel,
}: {
  loadState: RouteLoadState;
  onRetry: () => void;
  children: ReactNode;
  loadingLabel?: string;
}) {
  if (loadState === "loading") {
    return <RouteStatus loading loadingLabel={loadingLabel} />;
  }
  if (loadState === "error") {
    return <RouteStatus error onRetry={onRetry} />;
  }
  return children;
}
