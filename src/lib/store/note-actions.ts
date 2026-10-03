import { getBackend } from "@/lib/backend/get-backend";
import type { NoteFormat, NoteMeta, TextFile } from "@/lib/backend/note-schemas";
import { parseSettings } from "@/lib/settings/settings-schema";
import { useAppStore } from "@/lib/store/app-store";
import { askConfirm, notify, reportError } from "@/lib/store/ui-actions";
import { visibleNotes } from "@/lib/store/visible-notes";

const AUTOSAVE_MS = 400;
const IMPORT_FORMATS: Record<string, NoteFormat> = { md: "md", markdown: "md", txt: "txt" };

const { getState, setState } = useAppStore;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let started = false;

function listed(): NoteMeta[] {
  const state = getState();
  return visibleNotes({ ...state, sort: state.settings.sort });
}

export async function refreshNotes() {
  const backend = getBackend();
  const [notes, trash] = await Promise.all([backend.listNotes(), backend.listTrash()]);
  setState({ notes, trash });
}

/** Writes the editor buffer if it differs from disk. Safe to call at any time. */
export async function flushSave() {
  clearTimeout(saveTimer);
  const { activeId, content, savedContent } = getState();
  if (activeId === null || content === savedContent) return;
  setState({ saving: true });
  try {
    await getBackend().writeNote(activeId, content);
    // Only what was actually written counts as saved; typing may have continued.
    if (getState().activeId === activeId) setState({ savedContent: content });
    await refreshNotes();
  } catch (error) {
    reportError(error);
  } finally {
    setState({ saving: false });
  }
  if (getState().activeId === activeId && getState().content !== content) scheduleSave();
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void flushSave(), AUTOSAVE_MS);
}

/** Called by the editor on every change. */
export function setContent(content: string) {
  if (getState().activeId === null) return;
  setState({ content });
  scheduleSave();
}

function closeNote() {
  clearTimeout(saveTimer);
  setState({ activeId: null, content: "", savedContent: "" });
}

export async function openNote(id: string) {
  try {
    await flushSave();
    const note = await getBackend().readNote(id);
    const view = getState().view === "trash" ? "all" : getState().view;
    setState({ activeId: note.id, content: note.content, savedContent: note.content, view });
  } catch (error) {
    reportError(error);
  }
}

/** Opens the neighbour of the open note in the list as currently shown. */
export async function openRelative(step: 1 | -1) {
  const notes = listed();
  if (getState().view === "trash" || notes.length === 0) return;
  const index = notes.findIndex((note) => note.id === getState().activeId);
  const next = notes[(index + step + notes.length) % notes.length];
  if (next) await openNote(next.id);
}

export async function createNote(format?: NoteFormat, title = "Untitled", content = "") {
  try {
    await flushSave();
    const meta = await getBackend().createNote(
      title,
      format ?? getState().settings.defaultFormat,
      content,
    );
    setState({ view: "all", tagFilter: null, filterText: "" });
    await refreshNotes();
    await openNote(meta.id);
  } catch (error) {
    reportError(error);
  }
}

/**
 * Runs a change that may give a note a new id (rename, format change) and
 * keeps the open note pointing at it.
 */
async function change(id: string, work: () => Promise<NoteMeta>) {
  try {
    const wasActive = getState().activeId === id;
    if (wasActive) await flushSave();
    const meta = await work();
    const backend = getBackend();
    const [notes, trash] = await Promise.all([backend.listNotes(), backend.listTrash()]);
    // One update, so the open note never points at an id the list lacks.
    setState(wasActive ? { activeId: meta.id, notes, trash } : { notes, trash });
  } catch (error) {
    reportError(error);
  }
}

export const renameNote = (id: string, title: string) =>
  change(id, () => getBackend().renameNote(id, title));

export const setNoteFormat = (id: string, format: NoteFormat) =>
  change(id, () => getBackend().setFormat(id, format));

export const setNotePinned = (id: string, pinned: boolean) =>
  change(id, () => getBackend().setPinned(id, pinned));

export const setNoteTags = (id: string, tags: string[]) =>
  change(id, () => getBackend().setTags(id, tags));

export async function duplicateNote(id: string) {
  try {
    await flushSave();
    const meta = await getBackend().duplicateNote(id);
    await refreshNotes();
    await openNote(meta.id);
  } catch (error) {
    reportError(error);
  }
}

export async function trashNote(id: string) {
  try {
    const wasActive = getState().activeId === id;
    const notes = listed();
    const index = notes.findIndex((note) => note.id === id);
    const neighbour = notes[index + 1] ?? notes[index - 1];
    if (wasActive) await flushSave();
    await getBackend().trashNote(id);
    if (wasActive) closeNote();
    await refreshNotes();
    if (wasActive && neighbour) await openNote(neighbour.id);
    notify("Moved to trash. Restore it from the Trash view.");
  } catch (error) {
    reportError(error);
  }
}

export async function restoreNote(id: string) {
  try {
    const meta = await getBackend().restoreNote(id);
    await refreshNotes();
    await openNote(meta.id);
  } catch (error) {
    reportError(error);
  }
}

export async function deleteNoteForever(id: string) {
  const note = getState().trash.find((entry) => entry.id === id);
  if (!note) return;
  const confirmed = await askConfirm(
    `Delete "${note.title}" permanently? This cannot be undone.`,
    "Delete permanently",
  );
  if (!confirmed) return;
  try {
    await getBackend().deleteNote(id);
    await refreshNotes();
  } catch (error) {
    reportError(error);
  }
}

export async function emptyTrash() {
  const count = getState().trash.length;
  if (count === 0) {
    notify("The trash is already empty.");
    return;
  }
  const confirmed = await askConfirm(
    `Delete ${count} trashed ${count === 1 ? "note" : "notes"} permanently? This cannot be undone.`,
    "Empty trash",
  );
  if (!confirmed) return;
  try {
    await getBackend().emptyTrash();
    await refreshNotes();
  } catch (error) {
    reportError(error);
  }
}

/** Turns picked or dropped files into notes. Files that are not notes are skipped. */
export async function importNotes(files: TextFile[]) {
  let imported = 0;
  let last: NoteMeta | undefined;
  try {
    await flushSave();
    for (const file of files) {
      const dot = file.name.lastIndexOf(".");
      const format = IMPORT_FORMATS[file.name.slice(dot + 1).toLowerCase()];
      if (dot <= 0 || !format) continue;
      last = await getBackend().createNote(file.name.slice(0, dot), format, file.content);
      imported += 1;
    }
    await refreshNotes();
    if (last) await openNote(last.id);
    notify(
      imported === 0
        ? "Nothing to import. Keyslate imports .md and .txt files."
        : `Imported ${imported} ${imported === 1 ? "note" : "notes"}.`,
    );
  } catch (error) {
    reportError(error);
  }
}

export async function changeVault() {
  try {
    const backend = getBackend();
    const path = await backend.pickFolder();
    if (path === null) return;
    await flushSave();
    await backend.setVaultPath(path);
    closeNote();
    setState({ vaultPath: path, view: "all", tagFilter: null, filterText: "" });
    await refreshNotes();
    await openMostRecent();
  } catch (error) {
    reportError(error);
  }
}

async function openMostRecent() {
  const [latest] = [...getState().notes].sort((a, b) => b.modified - a.modified);
  if (latest) await openNote(latest.id);
}

/** Something outside Keyslate touched the vault. Never clobbers unsaved typing. */
async function syncFromDisk() {
  try {
    await refreshNotes();
    const { activeId, content, savedContent, notes } = getState();
    if (activeId === null || content !== savedContent) return;
    if (!notes.some((note) => note.id === activeId)) {
      closeNote();
      return;
    }
    const note = await getBackend().readNote(activeId);
    const now = getState();
    if (now.activeId === activeId && now.content === now.savedContent) {
      setState({ content: note.content, savedContent: note.content });
    }
  } catch (error) {
    reportError(error);
  }
}

/** Loads settings and notes, then wires the backend's events. Call once. */
export async function startApp() {
  // StrictMode mounts twice in development; the backend listeners must not double up.
  if (started) return;
  started = true;
  const backend = getBackend();
  try {
    const settings = parseSettings(await backend.loadSettings());
    setState({ settings, vaultPath: await backend.getVaultPath() });
    await refreshNotes();
    await openMostRecent();
    // A taken accelerator is worth a message but must not block startup.
    backend.setGlobalShortcut(settings.globalShortcut).catch(reportError);
  } catch (error) {
    reportError(error);
  } finally {
    setState({ ready: true });
  }
  backend.onVaultChanged(() => void syncFromDisk());
  backend.onQuickCapture(() => void createNote());
  backend.onFilesDropped((files) => void importNotes(files));
  backend.onBeforeClose(flushSave);
  window.addEventListener("blur", () => void flushSave());
}
