import { z } from "zod";
import type { Backend } from "@/lib/backend/backend";
import {
  type Note,
  type NoteFormat,
  type NoteMeta,
  noteSchema,
  type TextFile,
} from "@/lib/backend/note-schemas";

const STORAGE_KEY = "keyslate-mock";
const MAX_HITS = 200;

const persistedSchema = z.object({
  notes: z.array(noteSchema),
  trash: z.array(noteSchema),
  settings: z.unknown(),
});

type Persisted = z.infer<typeof persistedSchema>;

const WELCOME: Note = {
  id: "Welcome.md",
  title: "Welcome",
  format: "md",
  pinned: false,
  tags: [],
  modified: 0,
  size: 0,
  content:
    "# Welcome to Keyslate\n\nPress **Ctrl+K** for every command, **Ctrl+N** for a new note.\n",
};

function load(): Persisted {
  try {
    const parsed = persistedSchema.safeParse(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? ""));
    if (parsed.success) return parsed.data;
  } catch {
    // Nothing stored yet, or storage is unavailable: start fresh.
  }
  return { notes: [{ ...WELCOME, modified: Date.now() }], trash: [], settings: null };
}

function sanitizeTitle(title: string): string {
  const cleaned = title
    .replace(/[<>:"/\\|?*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 120) || "Untitled";
}

function toMeta(note: Note): NoteMeta {
  return {
    id: note.id,
    title: note.title,
    format: note.format,
    pinned: note.pinned,
    tags: note.tags,
    modified: note.modified,
    size: note.size,
  };
}

/**
 * In-memory stand-in for the Rust backend, persisted to localStorage. It
 * mirrors the rules that the UI depends on (unique titles, dedupe on create,
 * rename collisions) but Rust remains the authority on all of them.
 */
export function createMockBackend(): Backend {
  const state = load();
  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private mode or a full quota: the mock simply stops persisting.
    }
  };

  const taken = (pool: Note[], title: string, except?: string) =>
    pool.some((n) => n.id !== except && n.title.toLowerCase() === title.toLowerCase());

  const dedupe = (pool: Note[], title: string) => {
    let candidate = title;
    for (let n = 2; taken(pool, candidate); n += 1) candidate = `${title} ${n}`;
    return candidate;
  };

  const find = (pool: Note[], id: string) => {
    const note = pool.find((n) => n.id === id);
    if (!note) throw new Error(`"${id}" was not found.`);
    return note;
  };

  const stamp = (note: Note) => {
    note.modified = Date.now();
    note.size = new Blob([note.content]).size;
    save();
    return toMeta(note);
  };

  const add = (title: string, format: NoteFormat, content: string, tags: string[] = []) => {
    const unique = dedupe(state.notes, sanitizeTitle(title));
    const note: Note = {
      id: `${unique}.${format}`,
      title: unique,
      format,
      pinned: false,
      tags,
      modified: 0,
      size: 0,
      content,
    };
    state.notes.push(note);
    return stamp(note);
  };

  const retitle = (id: string, title: string, format: NoteFormat) => {
    const note = find(state.notes, id);
    if (taken(state.notes, title, id)) throw new Error(`A note named "${title}" already exists.`);
    note.title = title;
    note.format = format;
    note.id = `${title}.${format}`;
    return stamp(note);
  };

  return {
    native: false,

    getVaultPath: async () => "Browser preview (not saved to disk)",
    setVaultPath: async () => {},
    pickFolder: async () => null,
    revealVault: async () => {},
    exportVault: async () => null,

    listNotes: async () => state.notes.map(toMeta),
    listTrash: async () => state.trash.map(toMeta),
    readNote: async (id) => ({ ...find(state.notes, id) }),
    createNote: async (title, format, content) => add(title, format, content),
    writeNote: async (id, content) => {
      const note = find(state.notes, id);
      note.content = content;
      return stamp(note);
    },
    renameNote: async (id, title) =>
      retitle(id, sanitizeTitle(title), find(state.notes, id).format),
    setFormat: async (id, format) => retitle(id, find(state.notes, id).title, format),
    duplicateNote: async (id) => {
      const source = find(state.notes, id);
      return add(`${source.title} copy`, source.format, source.content, [...source.tags]);
    },
    setPinned: async (id, pinned) => {
      const note = find(state.notes, id);
      note.pinned = pinned;
      save();
      return toMeta(note);
    },
    setTags: async (id, tags) => {
      const note = find(state.notes, id);
      const cleaned = tags.map((t) => t.trim().toLowerCase().replace(/^#/, "")).filter(Boolean);
      note.tags = [...new Set(cleaned)].sort();
      save();
      return toMeta(note);
    },
    trashNote: async (id) => {
      const note = find(state.notes, id);
      state.notes = state.notes.filter((n) => n !== note);
      state.trash.push(note);
      save();
    },
    restoreNote: async (id) => {
      const note = find(state.trash, id);
      state.trash = state.trash.filter((n) => n !== note);
      note.title = dedupe(state.notes, note.title);
      note.id = `${note.title}.${note.format}`;
      state.notes.push(note);
      save();
      return toMeta(note);
    },
    deleteNote: async (id) => {
      state.trash = state.trash.filter((n) => n.id !== id);
      save();
    },
    emptyTrash: async () => {
      state.trash = [];
      save();
    },
    search: async (query) => {
      const needle = query.trim().toLowerCase();
      if (!needle) return [];
      const hits = state.notes.flatMap((note) => {
        const lines = note.content.split("\n").flatMap((text, index) =>
          text.toLowerCase().includes(needle)
            ? [
                {
                  id: note.id,
                  title: note.title,
                  line: index + 1,
                  snippet: text.trim().slice(0, 160),
                },
              ]
            : [],
        );
        if (lines.length > 0) return lines.slice(0, 5);
        return note.title.toLowerCase().includes(needle)
          ? [{ id: note.id, title: note.title, line: 0, snippet: "" }]
          : [];
      });
      return hits.slice(0, MAX_HITS);
    },

    openTextFiles: (extensions) =>
      new Promise<TextFile[]>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        input.accept = extensions.map((e) => `.${e}`).join(",");
        input.addEventListener("cancel", () => resolve([]));
        input.addEventListener("change", () => {
          void readFiles([...(input.files ?? [])]).then(resolve);
        });
        input.click();
      }),
    saveTextFile: async (name, content) => {
      const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
      return name;
    },

    loadSettings: async () => state.settings,
    saveSettings: async (settings) => {
      state.settings = settings;
      save();
    },
    setGlobalShortcut: async () => {},

    onVaultChanged: () => () => {},
    onQuickCapture: () => () => {},
    onFilesDropped: (listener) => {
      const allow = (event: DragEvent) => event.preventDefault();
      const drop = (event: DragEvent) => {
        event.preventDefault();
        void readFiles([...(event.dataTransfer?.files ?? [])]).then(listener);
      };
      window.addEventListener("dragover", allow);
      window.addEventListener("drop", drop);
      return () => {
        window.removeEventListener("dragover", allow);
        window.removeEventListener("drop", drop);
      };
    },
    onBeforeClose: () => () => {},
  };
}

async function readFiles(files: File[]): Promise<TextFile[]> {
  return Promise.all(files.map(async (file) => ({ name: file.name, content: await file.text() })));
}
