import { useCommandKey } from "@/hooks/use-command-key";
import { cn } from "@/lib/cn";
import { executeCommand } from "@/lib/commands/execute";

interface CommandHintProps {
  commandId: string;
  label: string;
  /** "button" is an outlined control; "quiet" is bare text for dense bars. */
  variant?: "button" | "quiet";
  className?: string;
}

/**
 * A button that runs a command and shows the key currently bound to it, so a
 * hint can never name a key that is not bound.
 */
export function CommandHint({ commandId, label, variant = "button", className }: CommandHintProps) {
  const key = useCommandKey(commandId);

  return (
    <button
      type="button"
      className={cn(
        variant === "button"
          ? "ks-button"
          : "flex items-center gap-1.5 rounded-control px-1.5 hover:bg-hover",
        className,
      )}
      onClick={() => executeCommand(commandId)}
    >
      {label}
      {key ? <kbd className="ks-kbd">{key}</kbd> : null}
    </button>
  );
}
