import { getBackend } from "@/lib/backend/get-backend";
import type { Command } from "@/lib/commands/registry";
import { FONT_SIZE, type ViewMode } from "@/lib/settings/settings-schema";
import { useAppStore } from "@/lib/store/app-store";
import {
  changeVault,
  createNote,
  duplicateNote,
  emptyTrash,
  flushSave,
  openRelative,
  setNoteFormat,
  setNotePinned,
  trashNote,
} from "@/lib/store/note-actions";
import { notify, openOverlay, setView, updateSettings } from "@/lib/store/ui-actions";

const VIEW_CYCLE: Record<ViewMode, ViewMode> = { edit: "split", split: "preview", preview: "edit" };

const state = () => useAppStore.getState();

/** Runs `work` on the open note, or says why it cannot. */
function withActive(work: (id: string) => void | Promise<void>) {
  return () => {
    const { activeId } = state();
    if (activeId === null) {
      notify("Open a note first.");
      return;
    }
    return work(activeId);
  };
}

const activeMeta = (id: string) => state().notes.find((note) => note.id === id);

function zoom(step: number) {
  const size = state().settings.fontSize + step;
  updateSettings({ fontSize: Math.min(FONT_SIZE.max, Math.max(FONT_SIZE.min, size)) });
}

/**
 * Commands that need nothing but the store. Commands that need a mounted
 * component (the editor view, the list's focus) are registered by that
 * component instead.
 */
export const APP_COMMANDS: readonly Command[] = [
  {
    id: "note.new",
    title: "New note",
    group: "Note",
    defaultKey: "Ctrl+N",
    run: () => createNote(),
  },
  {
    id: "note.newText",
    title: "New plain-text note",
    group: "Note",
    defaultKey: "Ctrl+Shift+N",
    run: () => createNote("txt"),
  },
  { id: "note.save", title: "Save now", group: "Note", defaultKey: "Ctrl+S", run: flushSave },
  {
    id: "note.duplicate",
    title: "Duplicate note",
    group: "Note",
    defaultKey: "Ctrl+Shift+D",
    run: withActive(duplicateNote),
  },
  {
    id: "note.togglePin",
    title: "Pin or unpin note",
    group: "Note",
    defaultKey: "Alt+P",
    run: withActive((id) => setNotePinned(id, !activeMeta(id)?.pinned)),
  },
  {
    id: "note.toggleFormat",
    title: "Switch between Markdown and plain text",
    group: "Note",
    defaultKey: "Ctrl+Shift+M",
    run: withActive((id) => setNoteFormat(id, activeMeta(id)?.format === "md" ? "txt" : "md")),
  },
  {
    id: "note.trash",
    title: "Move note to trash",
    group: "Note",
    defaultKey: "Ctrl+Shift+Delete",
    run: withActive(trashNote),
  },
  {
    id: "note.next",
    title: "Next note",
    group: "Go",
    defaultKey: "Ctrl+PageDown",
    run: () => openRelative(1),
  },
  {
    id: "note.previous",
    title: "Previous note",
    group: "Go",
    defaultKey: "Ctrl+PageUp",
    run: () => openRelative(-1),
  },
  {
    id: "palette.open",
    title: "Show all commands",
    group: "Go",
    defaultKey: "Ctrl+K",
    run: () => openOverlay("palette"),
  },
  {
    id: "quickOpen.open",
    title: "Go to note",
    group: "Go",
    defaultKey: "Ctrl+P",
    run: () => openOverlay("quick-open"),
  },
  {
    id: "search.open",
    title: "Search in all notes",
    group: "Go",
    defaultKey: "Ctrl+Shift+F",
    run: () => openOverlay("search"),
  },
  {
    id: "settings.open",
    title: "Open settings",
    group: "App",
    defaultKey: "Ctrl+,",
    run: () => openOverlay("settings"),
  },
  {
    id: "shortcuts.open",
    title: "Show keyboard shortcuts",
    group: "App",
    defaultKey: "F1",
    run: () => openOverlay("shortcuts"),
  },
  {
    id: "view.toggleSidebar",
    title: "Show or hide the sidebar",
    group: "View",
    defaultKey: "Ctrl+\\",
    run: () => updateSettings({ sidebarVisible: !state().settings.sidebarVisible }),
  },
  {
    id: "view.edit",
    title: "Editor only",
    group: "View",
    defaultKey: "Alt+1",
    run: () => updateSettings({ viewMode: "edit" }),
  },
  {
    id: "view.split",
    title: "Editor and preview side by side",
    group: "View",
    defaultKey: "Alt+2",
    run: () => updateSettings({ viewMode: "split" }),
  },
  {
    id: "view.preview",
    title: "Preview only",
    group: "View",
    defaultKey: "Alt+3",
    run: () => updateSettings({ viewMode: "preview" }),
  },
  {
    id: "view.cycle",
    title: "Cycle editor, split and preview",
    group: "View",
    defaultKey: "Ctrl+E",
    run: () => updateSettings({ viewMode: VIEW_CYCLE[state().settings.viewMode] }),
  },
  {
    id: "view.zoomIn",
    title: "Larger text",
    group: "View",
    defaultKey: "Ctrl+=",
    run: () => zoom(1),
  },
  {
    id: "view.zoomOut",
    title: "Smaller text",
    group: "View",
    defaultKey: "Ctrl+-",
    run: () => zoom(-1),
  },
  {
    id: "view.zoomReset",
    title: "Reset text size",
    group: "View",
    defaultKey: "Ctrl+0",
    run: () => updateSettings({ fontSize: FONT_SIZE.fallback }),
  },
  {
    id: "view.toggleWordWrap",
    title: "Toggle word wrap",
    group: "View",
    defaultKey: "Alt+Z",
    run: () => updateSettings({ wordWrap: !state().settings.wordWrap }),
  },
  {
    id: "view.toggleLineNumbers",
    title: "Toggle line numbers",
    group: "View",
    run: () => updateSettings({ lineNumbers: !state().settings.lineNumbers }),
  },
  {
    id: "view.toggleSort",
    title: "Sort notes by title or last edited",
    group: "View",
    run: () => updateSettings({ sort: state().settings.sort === "title" ? "modified" : "title" }),
  },
  { id: "list.showAll", title: "Show all notes", group: "Go", run: () => setView("all") },
  { id: "list.showPinned", title: "Show pinned notes", group: "Go", run: () => setView("pinned") },
  { id: "list.showTrash", title: "Show trash", group: "Go", run: () => setView("trash") },
  { id: "trash.empty", title: "Empty trash", group: "Vault", run: emptyTrash },
  { id: "vault.change", title: "Choose vault folder", group: "Vault", run: changeVault },
  {
    id: "vault.reveal",
    title: "Open vault folder in Explorer",
    group: "Vault",
    run: () => getBackend().revealVault(),
  },
  {
    id: "vault.export",
    title: "Export all notes to a folder",
    group: "Vault",
    run: async () => {
      const path = await getBackend().exportVault();
      if (path !== null) notify(`Exported all notes to ${path}`);
    },
  },
];
