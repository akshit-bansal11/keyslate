import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { executeCommand } from "@/lib/commands/execute";

interface CommandButtonProps {
  commandId: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

/** A button that runs a registered command, so the dialog and the palette share one code path. */
export function CommandButton({ commandId, disabled, className, children }: CommandButtonProps) {
  return (
    <button
      type="button"
      className={cn("ks-button", className)}
      disabled={disabled}
      onClick={() => executeCommand(commandId)}
    >
      {children}
    </button>
  );
}
