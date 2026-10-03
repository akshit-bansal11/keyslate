import { Pin, RotateCcw, Trash2 } from "lucide-react";
import { memo } from "react";
import type { NoteMeta } from "@/lib/backend/note-schemas";
import { cn } from "@/lib/cn";
import { MAX_ROW_TAGS } from "@/lib/sidebar/sidebar-constants";

interface NoteRowProps {
  note: NoteMeta;
  /** The "last edited" text, already formatted. */
  edited: string;
  /** This is the open note. */
  selected: boolean;
  /** The one row Tab lands on; the list moves focus between rows itself. */
  tabbable: boolean;
  trashed: boolean;
}

const ACTION_CLASS =
  "ks-sidebar-target grid size-6 shrink-0 place-items-center rounded-control hover:bg-active";

/**
 * One option in the note list. It owns no handlers and no store subscription:
 * the list reads `data-id` and `data-action` from the event target, so a row
 * re-renders only when its own props change.
 */
export const NoteRow = memo(function NoteRow({
  note,
  edited,
  selected,
  tabbable,
  trashed,
}: NoteRowProps) {
  return (
    <div
      role="option"
      aria-selected={selected}
      tabIndex={tabbable ? 0 : -1}
      data-id={note.id}
      className={cn(
        "ks-note-row flex cursor-default items-center gap-1 border-l-2 px-2 hover:bg-hover",
        selected ? "border-accent bg-selected" : "border-transparent",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-sm">
          {note.pinned ? (
            <>
              <Pin aria-hidden="true" focusable="false" className="size-3.5 shrink-0 text-muted" />
              <span className="sr-only">Pinned</span>
            </>
          ) : null}
          <span title={note.title} className={cn("truncate", selected && "font-semibold")}>
            {note.title}
          </span>
        </div>
        {/* Muted text is only measured against plain backgrounds, not the selected tint. */}
        <div
          className={cn("flex items-center gap-1.5 text-xs", selected ? "text-text" : "text-muted")}
        >
          <span className="shrink-0">{edited}</span>
          {note.format === "txt" ? (
            <span className="shrink-0 rounded-control border border-border px-1">txt</span>
          ) : null}
          <span className="truncate">
            {note.tags
              .slice(0, MAX_ROW_TAGS)
              .map((tag) => `#${tag}`)
              .join(" ")}
          </span>
        </div>
      </div>
      {trashed ? (
        // Pointer shortcuts only: Enter and Delete on the row do the same from the keyboard.
        <>
          <button
            type="button"
            tabIndex={-1}
            data-action="restore"
            aria-label="Restore"
            title="Restore"
            className={ACTION_CLASS}
          >
            <RotateCcw aria-hidden="true" focusable="false" className="size-4" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            data-action="delete"
            aria-label="Delete permanently"
            title="Delete permanently"
            className={cn(ACTION_CLASS, "text-danger")}
          >
            <Trash2 aria-hidden="true" focusable="false" className="size-4" />
          </button>
        </>
      ) : null}
    </div>
  );
});
