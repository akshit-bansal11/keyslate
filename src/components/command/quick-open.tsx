import { Command } from "cmdk";
import { Pin, Plus } from "lucide-react";
import { useState } from "react";
import { Picker } from "@/components/command/picker";
import { Modal } from "@/components/ui/modal";
import { fuzzyRank } from "@/lib/command-ui/fuzzy";
import {
  closeIfCurrent,
  createNoteFromPicker,
  openNoteFromPicker,
} from "@/lib/command-ui/picker-actions";
import { useAppStore } from "@/lib/store/app-store";

/** A colon cannot appear in a Windows file name, so this never equals a note id. */
const CREATE_VALUE = ":create";

function QuickOpenBody() {
  const [query, setQuery] = useState("");
  const notes = useAppStore((state) => state.notes);
  const title = query.trim();
  const recentFirst = [...notes].sort((a, b) => b.modified - a.modified);
  const matches = fuzzyRank(recentFirst, query, (note) => [note.title, ...note.tags]);
  // File names are case-insensitive on Windows, so "Todo" and "todo" are the same note.
  const canCreate =
    title !== "" && !notes.some((note) => note.title.toLowerCase() === title.toLowerCase());

  return (
    <Picker
      label="Go to note"
      placeholder="Go to a note, or type a new title"
      query={query}
      onQueryChange={setQuery}
      empty="No notes yet. Type a title and press Enter to create the first one."
      status={`${matches.length} ${matches.length === 1 ? "note" : "notes"}`}
    >
      {matches.map((note) => (
        <Command.Item
          key={note.id}
          value={note.id}
          onSelect={() => openNoteFromPicker(note.id, null)}
        >
          {note.pinned ? (
            <Pin className="size-3.5 shrink-0 text-muted" aria-hidden="true" focusable="false" />
          ) : null}
          <span className="min-w-0 flex-1 truncate">
            {note.title}
            {note.pinned ? <span className="sr-only">, pinned</span> : null}
          </span>
          {note.tags.length > 0 ? (
            <span className="min-w-0 truncate text-muted text-xs">
              {note.tags.map((tag) => `#${tag}`).join(" ")}
            </span>
          ) : null}
          {note.format === "txt" ? (
            <span className="shrink-0 rounded-control border border-border px-1 text-muted text-xs">
              txt
            </span>
          ) : null}
        </Command.Item>
      ))}
      {canCreate ? (
        <Command.Item value={CREATE_VALUE} onSelect={() => createNoteFromPicker(title)}>
          <Plus className="size-3.5 shrink-0 text-muted" aria-hidden="true" focusable="false" />
          <span className="min-w-0 flex-1 truncate">Create note "{title}"</span>
        </Command.Item>
      ) : null}
    </Picker>
  );
}

/** Jump to a note by title or tag, or create one from what was typed. */
export function QuickOpen() {
  const open = useAppStore((state) => state.overlay === "quick-open");

  return (
    <Modal
      open={open}
      onClose={() => closeIfCurrent("quick-open")}
      label="Go to note"
      placement="top"
    >
      <QuickOpenBody />
    </Modal>
  );
}
