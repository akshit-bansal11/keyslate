import { Pin } from "lucide-react";
import type { KeyboardEvent, RefObject } from "react";
import { TagsEditor } from "@/components/editor/tags-editor";
import { FORMAT_LABEL } from "@/lib/backend/format-label";
import type { NoteFormat } from "@/lib/backend/note-schemas";
import { cn } from "@/lib/cn";
import { executeCommand } from "@/lib/commands/execute";
import { titleFromId } from "@/lib/editor/active-note";
import { useAppStore } from "@/lib/store/app-store";
import { renameNote } from "@/lib/store/note-actions";

interface NoteHeaderProps {
  id: string;
  format: NoteFormat;
  titleRef: RefObject<HTMLInputElement | null>;
  tagsRef: RefObject<HTMLInputElement | null>;
  /** Called when the user is finished with a field and wants the note back. */
  onDone: () => void;
  className?: string;
}

/** Title, format, pin and tags of the open note. Never re-renders on typing in the note. */
export function NoteHeader({ id, format, titleRef, tagsRef, onDone, className }: NoteHeaderProps) {
  const meta = useAppStore((state) => state.notes.find((note) => note.id === id));
  const title = meta?.title ?? titleFromId(id);
  const pinned = meta?.pinned ?? false;

  // Leaving the field is the one place a rename is committed, so Enter and Escape both blur.
  const commitTitle = (input: HTMLInputElement) => {
    const next = input.value.trim();
    if (next === "" || next === title) input.value = title;
    else void renameNote(id, next);
  };

  const onTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key !== "Enter" && event.key !== "Escape") return;
    if (event.key === "Escape") event.currentTarget.value = title;
    event.currentTarget.blur();
    onDone();
  };

  return (
    <header className={cn("flex flex-col gap-1.5 border-border border-b px-3 py-2", className)}>
      <div className="flex items-center gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Note title</span>
          <input
            // The id changes with the title, so a rename remounts the field with the stored name.
            key={id}
            ref={titleRef}
            type="text"
            defaultValue={title}
            autoComplete="off"
            spellCheck={false}
            className="w-full truncate rounded-control bg-transparent px-1 font-semibold text-lg"
            onKeyDown={onTitleKeyDown}
            onBlur={(event) => commitTitle(event.currentTarget)}
          />
        </label>
        <button
          type="button"
          title="Switch between Markdown and plain text"
          className="ks-button shrink-0 text-muted text-xs"
          onClick={() => executeCommand("note.toggleFormat")}
        >
          {FORMAT_LABEL[format]}
        </button>
        <button
          type="button"
          aria-label="Pin note"
          title="Pin note"
          aria-pressed={pinned}
          className={cn(
            "ks-hit grid size-7 shrink-0 place-items-center rounded-control hover:bg-hover",
            pinned && "bg-selected text-accent",
          )}
          onClick={() => executeCommand("note.togglePin")}
        >
          <Pin
            aria-hidden="true"
            focusable="false"
            className={cn("size-4", pinned && "fill-current")}
          />
        </button>
      </div>
      <TagsEditor id={id} tags={meta?.tags ?? []} inputRef={tagsRef} onDone={onDone} />
    </header>
  );
}
