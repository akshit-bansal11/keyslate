import { CircleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAppStore } from "@/lib/store/app-store";
import { dismissToast } from "@/lib/store/ui-actions";

/**
 * Both live regions stay mounted and only their text changes, so a message is
 * announced when it arrives. Errors use the alert region and wait for dismissal.
 */
export function ToastRegion() {
  const toast = useAppStore((state) => state.toast);
  const isError = toast?.tone === "error";

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-10 z-10 flex justify-center px-4",
        toast === null && "invisible",
      )}
    >
      <div className="pointer-events-auto flex max-w-xl items-start gap-2 rounded-card border border-border bg-raised px-3 py-2 shadow-overlay">
        {isError ? (
          <CircleAlert
            aria-hidden="true"
            focusable="false"
            className="mt-0.5 size-4 shrink-0 text-danger"
          />
        ) : null}
        <p role="status" aria-live="polite" className="selectable">
          {toast && !isError ? toast.message : ""}
        </p>
        <p role="alert" className="selectable">
          {toast && isError ? toast.message : ""}
        </p>
        <button
          type="button"
          aria-label="Dismiss message"
          title="Dismiss message"
          className="grid size-6 shrink-0 place-items-center rounded-control hover:bg-hover"
          onClick={dismissToast}
        >
          <X aria-hidden="true" focusable="false" className="size-4" />
        </button>
      </div>
    </div>
  );
}
