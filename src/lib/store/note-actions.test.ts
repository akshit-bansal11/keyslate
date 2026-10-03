import { beforeEach, describe, expect, it } from "vitest";
import { getBackend } from "@/lib/backend/get-backend";
import { useAppStore } from "@/lib/store/app-store";
import {
  createNote,
  flushSave,
  importNotes,
  openNote,
  refreshNotes,
  renameNote,
  restoreNote,
  setContent,
  setNoteFormat,
  trashNote,
} from "@/lib/store/note-actions";

// These run against the in-memory backend, which jsdom selects because there
// is no Tauri bridge. They cover the store's sequencing, not the filesystem.
const state = () => useAppStore.getState();
const titles = () => state().notes.map((note) => note.title);

beforeEach(async () => {
  const backend = getBackend();
  for (const note of await backend.listNotes()) await backend.trashNote(note.id);
  await backend.emptyTrash();
  useAppStore.setState({ activeId: null, content: "", savedContent: "", toast: null, view: "all" });
  await refreshNotes();
});

describe("note actions", () => {
  it("creates, opens, and saves what was typed", async () => {
    await createNote("md", "Draft");
    expect(state().activeId).toBe("Draft.md");

    setContent("hello");
    expect(state().content).not.toBe(state().savedContent);
    await flushSave();

    expect(state().savedContent).toBe("hello");
    expect((await getBackend().readNote("Draft.md")).content).toBe("hello");
  });

  it("saves pending edits before switching notes", async () => {
    await createNote("md", "One");
    await createNote("md", "Two");
    setContent("two body");
    await openNote("One.md");

    expect(state().activeId).toBe("One.md");
    expect((await getBackend().readNote("Two.md")).content).toBe("two body");
  });

  it("keeps the open note open across a rename and a format change", async () => {
    await createNote("md", "Before");
    setContent("kept");
    await renameNote("Before.md", "After");
    expect(state().activeId).toBe("After.md");

    await setNoteFormat("After.md", "txt");
    expect(state().activeId).toBe("After.txt");
    expect((await getBackend().readNote("After.txt")).content).toBe("kept");
  });

  it("reports a rename collision and leaves both notes alone", async () => {
    await createNote("md", "A");
    await createNote("md", "B");
    await renameNote("B.md", "A");

    expect(state().toast?.tone).toBe("error");
    expect(titles().sort()).toEqual(["A", "B"]);
    expect(state().activeId).toBe("B.md");
  });

  it("trashes the open note, opens a neighbour, and restores on request", async () => {
    await createNote("md", "Keep");
    await createNote("md", "Bin");
    await trashNote("Bin.md");

    expect(titles()).toEqual(["Keep"]);
    expect(state().activeId).toBe("Keep.md");
    expect(state().trash.map((note) => note.title)).toEqual(["Bin"]);

    await restoreNote("Bin.md");
    expect(state().activeId).toBe("Bin.md");
    expect(state().trash).toEqual([]);
  });

  it("imports .md and .txt, skips everything else, never overwrites", async () => {
    await createNote("md", "Readme");
    await importNotes([
      { name: "Readme.md", content: "imported" },
      { name: "list.TXT", content: "plain" },
      { name: "photo.png", content: "" },
      { name: ".md", content: "no name" },
    ]);

    expect(titles().sort()).toEqual(["Readme", "Readme 2", "list"]);
    expect(state().notes.find((note) => note.title === "list")?.format).toBe("txt");
    expect(state().toast?.message).toBe("Imported 2 notes.");
  });
});
