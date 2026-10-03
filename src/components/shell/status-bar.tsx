import { CommandHint } from "@/components/ui/command-hint";
import { FORMAT_LABEL } from "@/lib/backend/format-label";
import { countWords } from "@/lib/count-words";
import { useAppStore } from "@/lib/store/app-store";

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
        <CommandHint variant="quiet" commandId="palette.open" label="Commands" />
        <CommandHint variant="quiet" commandId="shortcuts.open" label="Shortcuts" />
      </div>
    </footer>
  );
}
