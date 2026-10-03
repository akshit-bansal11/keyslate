import type { Note, NoteFormat, NoteMeta, SearchHit, TextFile } from "@/lib/backend/note-schemas";

export type Unsubscribe = () => void;

/**
 * Everything the UI may ask of the machine. The Tauri implementation calls
 * Rust; the mock keeps notes in memory so the UI runs in a plain browser and
 * under Playwright. Every method rejects with a human-readable message.
 */
export interface Backend {
  /** False in the browser mock, where there is no real folder or OS dialog. */
  readonly native: boolean;

  getVaultPath(): Promise<string>;
  setVaultPath(path: string): Promise<void>;
  pickFolder(): Promise<string | null>;
  revealVault(): Promise<void>;
  /** Copies every note into a folder the user picks. Null when cancelled. */
  exportVault(): Promise<string | null>;

  listNotes(): Promise<NoteMeta[]>;
  listTrash(): Promise<NoteMeta[]>;
  readNote(id: string): Promise<Note>;
  createNote(title: string, format: NoteFormat, content: string): Promise<NoteMeta>;
  writeNote(id: string, content: string): Promise<NoteMeta>;
  renameNote(id: string, title: string): Promise<NoteMeta>;
  setFormat(id: string, format: NoteFormat): Promise<NoteMeta>;
  duplicateNote(id: string): Promise<NoteMeta>;
  setPinned(id: string, pinned: boolean): Promise<NoteMeta>;
  setTags(id: string, tags: string[]): Promise<NoteMeta>;
  trashNote(id: string): Promise<void>;
  restoreNote(id: string): Promise<NoteMeta>;
  deleteNote(id: string): Promise<void>;
  emptyTrash(): Promise<void>;
  search(query: string): Promise<SearchHit[]>;

  /** Native open dialog. Extensions come without dots. Empty when cancelled. */
  openTextFiles(extensions: string[]): Promise<TextFile[]>;
  /** Native save dialog. Resolves to the saved path, or null when cancelled. */
  saveTextFile(name: string, content: string): Promise<string | null>;

  /** Raw JSON as stored; null when nothing was saved yet. Validate before use. */
  loadSettings(): Promise<unknown>;
  saveSettings(settings: unknown): Promise<void>;
  /** Accelerator such as "Ctrl+Alt+N"; null clears it. */
  setGlobalShortcut(accelerator: string | null): Promise<void>;

  onVaultChanged(listener: () => void): Unsubscribe;
  onQuickCapture(listener: () => void): Unsubscribe;
  onFilesDropped(listener: (files: TextFile[]) => void): Unsubscribe;
  /** The listener is awaited before the window closes, so a pending save lands. */
  onBeforeClose(listener: () => Promise<void>): Unsubscribe;
}
