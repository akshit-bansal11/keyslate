import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { z } from "zod";
import type { Backend, Unsubscribe } from "@/lib/backend/backend";
import {
  noteMetaSchema,
  noteSchema,
  searchHitSchema,
  textFileSchema,
} from "@/lib/backend/note-schemas";

const nothing = z.unknown().transform(() => undefined);
const optionalPath = z.string().nullable();
const noteList = z.array(noteMetaSchema);
const textFiles = z.array(textFileSchema);

async function call<T>(schema: z.ZodType<T>, command: string, args?: Record<string, unknown>) {
  return schema.parse(await invoke<unknown>(command, args));
}

/** Tauri hands back the unlisten function asynchronously; this hides that. */
function subscribe(pending: Promise<Unsubscribe>): Unsubscribe {
  let stopped = false;
  let stop: Unsubscribe | undefined;
  void pending.then((unlisten) => {
    if (stopped) unlisten();
    else stop = unlisten;
  });
  return () => {
    stopped = true;
    stop?.();
  };
}

export const tauriBackend: Backend = {
  native: true,

  getVaultPath: () => call(z.string(), "get_vault_path"),
  setVaultPath: (path) => call(nothing, "set_vault_path", { path }),
  pickFolder: () => call(optionalPath, "pick_folder"),
  revealVault: () => call(nothing, "reveal_vault"),
  exportVault: () => call(optionalPath, "export_vault"),

  listNotes: () => call(noteList, "list_notes"),
  listTrash: () => call(noteList, "list_trash"),
  readNote: (id) => call(noteSchema, "read_note", { id }),
  createNote: (title, format, content) =>
    call(noteMetaSchema, "create_note", { title, format, content }),
  writeNote: (id, content) => call(noteMetaSchema, "write_note", { id, content }),
  renameNote: (id, title) => call(noteMetaSchema, "rename_note", { id, title }),
  setFormat: (id, format) => call(noteMetaSchema, "set_format", { id, format }),
  duplicateNote: (id) => call(noteMetaSchema, "duplicate_note", { id }),
  setPinned: (id, pinned) => call(noteMetaSchema, "set_pinned", { id, pinned }),
  setTags: (id, tags) => call(noteMetaSchema, "set_tags", { id, tags }),
  trashNote: (id) => call(nothing, "trash_note", { id }),
  restoreNote: (id) => call(noteMetaSchema, "restore_note", { id }),
  deleteNote: (id) => call(nothing, "delete_note", { id }),
  emptyTrash: () => call(nothing, "empty_trash"),
  search: (query) => call(z.array(searchHitSchema), "search", { query }),

  openTextFiles: (extensions) => call(textFiles, "open_text_files", { extensions }),
  saveTextFile: (name, content) => call(optionalPath, "save_text_file", { name, content }),

  loadSettings: () => invoke<unknown>("load_settings"),
  saveSettings: (settings) => call(nothing, "save_settings", { settings }),
  setGlobalShortcut: (accelerator) => call(nothing, "set_global_shortcut", { accelerator }),

  onVaultChanged: (listener) => subscribe(listen("vault-changed", () => listener())),
  onQuickCapture: (listener) => subscribe(listen("quick-capture", () => listener())),
  onFilesDropped: (listener) =>
    subscribe(
      getCurrentWebview().onDragDropEvent((event) => {
        if (event.payload.type !== "drop") return;
        void call(textFiles, "read_text_paths", { paths: event.payload.paths })
          .then(listener)
          .catch((error: unknown) => console.error(error));
      }),
    ),
  onBeforeClose: (listener) =>
    subscribe(
      getCurrentWindow().onCloseRequested(async () => {
        await listener();
      }),
    ),
};
