import { useCommands } from "@/hooks/use-commands";
import { executeCommand } from "@/lib/commands/execute";
import { keyFor } from "@/lib/commands/registry";
import { countWords } from "@/lib/count-words";
import { useAppStore } from "@/lib/store/app-store";

const FORMAT_LABEL = { md: "Markdown", txt: "Plain text" } as const;

/** Shows a command's live key binding, so a hint can never name an unbound key. */
function Hint({ commandId, label }: { commandId: string; label: string }) {
  const commands = useCommands();
  const keybindings = useAppStore((state) => state.settings.keybindings);
  const command = commands.find((entry) => entry.id === commandId);
  const key = command ? keyFor(command, keybindings) : undefined;

  return (
    <button
      type="button"
      className="flex items-center gap-1.5 rounded-control px-1.5 hover:bg-hover"
      onClick={() => executeCommand(commandId)}
    >
      {key ? <kbd className="ks-kbd">{key}</kbd> : null}
      {label}
    </button>
  );
}

export function StatusBar() {
  const active = useAppStore((state) => state.notes.find((note) => note.id === state.activeId));
  const content = useAppStore((state) => state.content);
  const dirty = useAppStore((state) => state.content !== state.savedContent);
  const saving = useAppStore((state) => state.saving);

  let saveLabel = "Saved";
  if (saving) saveLabel = "Saving";
  else if (dirty) saveLabel = "Unsaved";

  return (
    <footer className="flex h-7 shrink-0 items-center justify-between gap-4 border-border border-t bg-surface px-2 text-muted text-xs">
      <div className="flex min-w-0 items-center gap-3">
        {active ? (
          <>
            <span>{FORMAT_LABEL[active.format]}</span>
            <span>{countWords(content)} words</span>
            <span>{content.length} characters</span>
            <span role="status" aria-live="polite">
              {saveLabel}
            </span>
          </>
        ) : (
          <span>No note open</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Hint commandId="palette.open" label="Commands" />
        <Hint commandId="shortcuts.open" label="Shortcuts" />
      </div>
    </footer>
  );
}
