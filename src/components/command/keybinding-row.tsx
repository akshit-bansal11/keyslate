import type { KeyboardEvent } from "react";
import { KEY_CAPTURE_ATTRIBUTE } from "@/hooks/use-global-keys";
import { cn } from "@/lib/cn";
import { keyFromEvent } from "@/lib/commands/keys";

interface KeybindingRowProps {
  title: string;
  /** Muted text after the title: the command's group. */
  detail: string;
  currentKey: string | undefined;
  /** True when the key differs from the default, which is when Reset is offered. */
  overridden: boolean;
  recording: boolean;
  /** Why the last combination was refused. */
  problem: string | undefined;
  /** Names the command already on the chosen key; shows Replace and Cancel. */
  conflict: string | undefined;
  onStart: () => void;
  onStop: () => void;
  /** A combination was pressed; an empty string means "remove the shortcut". */
  onKey: (key: string) => void;
  onReplace: () => void;
  onReset: () => void;
  className?: string;
}

/** One shortcut with its recorder. The Change button itself listens for the combination, so focus never moves. */
export function KeybindingRow({
  title,
  detail,
  currentKey,
  overridden,
  recording,
  problem,
  conflict,
  onStart,
  onStop,
  onKey,
  onReplace,
  onReset,
  className,
}: KeybindingRowProps) {
  function record(event: KeyboardEvent<HTMLButtonElement>) {
    // Tab still leaves the row, which cancels through onBlur: recording is never a keyboard trap.
    if (event.key === "Tab") return;
    // Also keeps Escape from closing the dialog this row sits in.
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") {
      onStop();
      return;
    }
    const key = keyFromEvent(event);
    if (key === null) return;
    onKey(key === "Backspace" || key === "Delete" ? "" : key);
  }

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 border-border border-b py-1.5",
        className,
      )}
      {...(recording ? { [KEY_CAPTURE_ATTRIBUTE]: "" } : {})}
    >
      <span className="min-w-0 flex-1 basis-48">
        {title}
        <span className="text-muted text-xs"> {detail}</span>
      </span>
      {currentKey ? (
        <kbd className="ks-kbd">{currentKey}</kbd>
      ) : (
        <span className="text-muted text-xs">No shortcut</span>
      )}
      <button
        type="button"
        className="ks-button"
        onClick={recording ? onStop : onStart}
        onKeyDown={recording ? record : undefined}
        onBlur={recording ? onStop : undefined}
      >
        {recording ? "Cancel" : "Change"}
        <span className="sr-only"> shortcut for {title}</span>
      </button>
      {overridden && !recording ? (
        <button type="button" className="ks-button" onClick={onReset}>
          Reset
          <span className="sr-only"> shortcut for {title}</span>
        </button>
      ) : null}
      {recording ? (
        <p className="basis-full text-muted text-xs">
          Press a key combination… Backspace removes the shortcut. Escape cancels.
        </p>
      ) : null}
      {problem ? <p className="basis-full text-danger text-xs">Not bound. {problem}</p> : null}
      {conflict ? (
        <div className="flex basis-full flex-wrap items-center gap-2 text-xs">
          <p className="min-w-0">{conflict}</p>
          <button type="button" className="ks-button" onClick={onReplace}>
            Replace
          </button>
          <button type="button" className="ks-button" onClick={onStop}>
            Cancel
          </button>
        </div>
      ) : null}
    </li>
  );
}
