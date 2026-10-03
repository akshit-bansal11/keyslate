import type { NoteFormat } from "@/lib/backend/note-schemas";
import type { AppState } from "@/lib/store/app-store";

/**
 * The open note's format. A rename or format change swaps `activeId` a moment
 * before the note list is refreshed; the file extension covers that gap.
 */
export function activeFormat(state: Pick<AppState, "activeId" | "notes">): NoteFormat {
  const id = state.activeId;
  const listed = state.notes.find((note) => note.id === id)?.format;
  return listed ?? (id?.endsWith(".txt") ? "txt" : "md");
}

/** A note's title is its file stem. */
export function titleFromId(id: string): string {
  return id.replace(/\.[^.]+$/, "");
}
