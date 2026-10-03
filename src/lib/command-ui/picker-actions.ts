import { rememberCommand } from "@/lib/command-ui/recent-commands";
import { executeCommand } from "@/lib/commands/execute";
import { type Overlay, useAppStore } from "@/lib/store/app-store";
import { createNote, openNote } from "@/lib/store/note-actions";
import { closeOverlay, openOverlay, setPendingLine } from "@/lib/store/ui-actions";

/**
 * `onClose` for an overlay's Modal. A dialog's close event arrives after the
 * store has already moved on, so an unguarded `closeOverlay` would also close
 * the overlay that a command just opened in its place.
 */
export function closeIfCurrent(overlay: Overlay) {
  if (useAppStore.getState().overlay === overlay) closeOverlay();
}

/**
 * Closes the overlay, then runs `work` once the dialog is really gone. While
 * it is still modal the rest of the app is inert, so focusing the editor from
 * inside the same tick would be lost.
 */
function afterClose(work: () => void) {
  closeOverlay();
  setTimeout(work, 0);
}

const focusEditor = () => executeCommand("editor.focus");

export function runCommandFromPicker(id: string) {
  rememberCommand(id);
  afterClose(() => executeCommand(id));
}

/** `line` is 1-based; null opens the note without moving the caret. */
export function openNoteFromPicker(id: string, line: number | null) {
  afterClose(() => {
    setPendingLine(line);
    void openNote(id).then(focusEditor);
  });
}

export function createNoteFromPicker(title: string) {
  afterClose(() => void createNote(undefined, title).then(focusEditor));
}

/** Replaces the open overlay with another one, letting the first dialog close before the next opens. */
export function switchOverlay(overlay: Overlay) {
  afterClose(() => openOverlay(overlay));
}
