import { undoDepth } from "@codemirror/commands";
import { language } from "@codemirror/language";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { NoteMeta } from "@/lib/backend/note-schemas";
import { getEditorView, mountEditor } from "@/lib/editor/editor-instance";
import { useAppStore } from "@/lib/store/app-store";

const NOTE: Omit<NoteMeta, "id"> = {
  title: "a",
  format: "md",
  pinned: false,
  tags: [],
  modified: 0,
  size: 0,
};
let unmount: () => void;

function view() {
  const current = getEditorView();
  if (!current) throw new Error("no editor mounted");
  return current;
}

const text = () => view().state.doc.toString();
const caretLine = () => view().state.doc.lineAt(view().state.selection.main.head).number;

beforeEach(() => {
  // Typing schedules an autosave; the tests end before it would fire.
  vi.useFakeTimers();
  useAppStore.setState({
    notes: [
      { ...NOTE, id: "a.md" },
      { ...NOTE, id: "b.md" },
    ],
    activeId: "a.md",
    content: "one\ntwo\nthree",
    savedContent: "one\ntwo\nthree",
    pendingLine: null,
  });
  unmount = mountEditor(document.body.appendChild(document.createElement("div")));
});

afterEach(() => {
  unmount();
  vi.useRealTimers();
});

it("loads the open note and reports typing to the store", () => {
  expect(text()).toBe("one\ntwo\nthree");
  view().dispatch({ changes: { from: 0, insert: "zero\n" } });
  expect(useAppStore.getState().content).toBe("zero\none\ntwo\nthree");
});

it("takes a change from disk without echoing it back or moving the caret to the top", () => {
  view().dispatch({ selection: { anchor: 13 } });
  const seen: string[] = [];
  const stop = useAppStore.subscribe((state) => seen.push(state.content));
  useAppStore.setState({ content: "one\n2\nthree", savedContent: "one\n2\nthree" });
  stop();
  expect(text()).toBe("one\n2\nthree");
  expect(seen).toEqual(["one\n2\nthree"]);
  expect(caretLine()).toBe(3);
});

it("starts a fresh undo history for each note", () => {
  view().dispatch({ changes: { from: 0, insert: "x" } });
  expect(undoDepth(view().state)).toBe(1);
  useAppStore.setState({ activeId: "b.md", content: "other", savedContent: "other" });
  expect(text()).toBe("other");
  expect(undoDepth(view().state)).toBe(0);
});

it("applies a pending line set before the note opens, clamped, then clears it", () => {
  useAppStore.setState({ pendingLine: 99 });
  expect(useAppStore.getState().pendingLine).toBe(99);
  useAppStore.setState({ activeId: "b.md", content: "a\nb\nc\nd", savedContent: "a\nb\nc\nd" });
  expect(caretLine()).toBe(4);
  expect(useAppStore.getState().pendingLine).toBeNull();
});

it("applies a pending line for the note that is already open", () => {
  useAppStore.setState({ pendingLine: 2 });
  expect(caretLine()).toBe(2);
});

it("drops the Markdown language for a plain-text note", () => {
  expect(view().state.facet(language)).not.toBeNull();
  useAppStore.setState({ activeId: "c.txt", content: "plain", savedContent: "plain" });
  expect(text()).toBe("plain");
  expect(view().state.facet(language)).toBeNull();
});
