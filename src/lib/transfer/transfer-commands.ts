import { getBackend } from "@/lib/backend/get-backend";
import type { NoteFormat } from "@/lib/backend/note-schemas";
import type { Command } from "@/lib/commands/registry";
import { useAppStore } from "@/lib/store/app-store";
import { importNotes } from "@/lib/store/note-actions";
import { notify, updateSettings } from "@/lib/store/ui-actions";
import { safeFileName } from "@/lib/transfer/file-name";
import { buildHtmlDocument, noteToHtml, noteToPlainText } from "@/lib/transfer/note-export";
import { parseSettingsFile } from "@/lib/transfer/settings-file";

const NOTE_EXTENSIONS = ["md", "markdown", "txt"];
const SETTINGS_FILE_NAME = "keyslate-settings.json";

interface OpenNote {
  title: string;
  format: NoteFormat;
  /** The editor buffer, which is ahead of the file on disk while typing. */
  content: string;
}

/** Runs `work` on the open note, or says why it cannot. */
function withNote(work: (note: OpenNote) => Promise<void>) {
  return async () => {
    const { activeId, notes, content } = useAppStore.getState();
    const meta = notes.find((note) => note.id === activeId);
    if (!meta) {
      notify("Open a note first.");
      return;
    }
    await work({ title: meta.title, format: meta.format, content });
  };
}

async function saveAs(name: string, content: string) {
  const path = await getBackend().saveTextFile(name, content);
  if (path !== null) notify(`Exported to ${path}`);
}

async function copyRichText({ format, content }: OpenNote) {
  const html = noteToHtml(format, content);
  if (typeof ClipboardItem === "undefined") {
    await navigator.clipboard.writeText(html);
    notify("Copied as HTML source. This window cannot copy rich text.");
    return;
  }
  const item = new ClipboardItem({
    "text/html": new Blob([html], { type: "text/html" }),
    "text/plain": new Blob([noteToPlainText(format, content)], { type: "text/plain" }),
  });
  await navigator.clipboard.write([item]);
  notify("Copied as rich text.");
}

async function importSettings() {
  const [file] = await getBackend().openTextFiles(["json"]);
  if (!file) return;
  const settings = parseSettingsFile(file.content, useAppStore.getState().settings);
  if (settings === null) {
    notify(`${file.name} is not a Keyslate settings file. Nothing was changed.`, "error");
    return;
  }
  updateSettings(settings);
  notify("Settings imported. Your vault folder was left as it is.");
}

export const TRANSFER_COMMANDS: readonly Command[] = [
  {
    id: "import.notes",
    title: "Import notes from files",
    group: "Note",
    defaultKey: "Ctrl+O",
    run: async () => {
      const files = await getBackend().openTextFiles(NOTE_EXTENSIONS);
      if (files.length > 0) await importNotes(files);
    },
  },
  {
    id: "export.note",
    title: "Export note as a file",
    group: "Note",
    defaultKey: "Ctrl+Shift+S",
    run: withNote(({ title, format, content }) =>
      saveAs(`${safeFileName(title)}.${format}`, content),
    ),
  },
  {
    id: "export.html",
    title: "Export note as HTML",
    group: "Note",
    run: withNote(({ title, format, content }) =>
      saveAs(`${safeFileName(title)}.html`, buildHtmlDocument(title, noteToHtml(format, content))),
    ),
  },
  {
    id: "copy.markdown",
    title: "Copy note as Markdown",
    group: "Note",
    defaultKey: "Ctrl+Shift+C",
    run: withNote(async ({ format, content }) => {
      await navigator.clipboard.writeText(content);
      notify(format === "md" ? "Copied as Markdown." : "Copied as plain text.");
    }),
  },
  {
    id: "copy.html",
    title: "Copy note as rich text",
    group: "Note",
    defaultKey: "Ctrl+Alt+C",
    run: withNote(copyRichText),
  },
  {
    id: "copy.text",
    title: "Copy note as plain text",
    group: "Note",
    run: withNote(async ({ format, content }) => {
      await navigator.clipboard.writeText(noteToPlainText(format, content));
      notify("Copied as plain text.");
    }),
  },
  {
    id: "settings.export",
    title: "Export settings to a file",
    group: "App",
    run: () =>
      saveAs(SETTINGS_FILE_NAME, `${JSON.stringify(useAppStore.getState().settings, null, 2)}\n`),
  },
  {
    id: "settings.import",
    title: "Import settings from a file",
    group: "App",
    run: importSettings,
  },
];
