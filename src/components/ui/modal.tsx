import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name, announced when the dialog opens. */
  label: string;
  /** "top" suits a palette; "center" suits a settings sheet or a confirmation. */
  placement?: "top" | "center";
  className?: string;
  children: ReactNode;
}

/**
 * The one modal primitive: a native `<dialog>` opened with `showModal()`, which
 * supplies the top layer, background inertness, Escape and focus return.
 * Children mount only while open, so each opening starts from fresh state.
 */
export function Modal({
  open,
  onClose,
  label,
  placement = "center",
  className,
  children,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const openRef = useRef(open);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    openRef.current = open;
    // Light dismiss: a click on the backdrop closes it, natively.
    dialog.setAttribute("closedby", "any");
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal focuses the first focusable node, which can be a wrapper with
      // tabindex="-1" (cmdk renders one). Typing must land in a real control.
      dialog.querySelector<HTMLElement>("input, textarea, select, button")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      // The close event is asynchronous. When the owner already set `open` to
      // false (one overlay replacing another), reporting it again would close
      // whatever was opened in the meantime.
      onClose={() => {
        if (openRef.current) onClose();
      }}
      className={cn(
        "ks-modal overflow-hidden rounded-surface border border-border bg-raised p-0 text-text shadow-modal open:flex open:animate-enter open:flex-col",
        placement === "top" && "ks-modal-top",
        className,
      )}
    >
      {open ? children : null}
    </dialog>
  );
}
