import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { EditorPane } from "@/components/editor/editor-pane";
import { APP_COMMANDS } from "@/lib/commands/app-commands";
import { registerCommands } from "@/lib/commands/registry";
import { parseSettings } from "@/lib/settings/settings-schema";
import { type AppState, useAppStore } from "@/lib/store/app-store";
import { renameNote, setNoteTags } from "@/lib/store/note-actions";

vi.mock("@/lib/store/note-actions", async (original) => ({
  ...(await original<typeof import("@/lib/store/note-actions")>()),
  renameNote: vi.fn(),
  setNoteTags: vi.fn(),
}));

const NOTE = { format: "md", pinned: false, modified: 0, size: 0 } as const;
const CONTENT = "# Heading\n\n[site](https://example.com)";

let container: HTMLElement;
let root: Root;
let unregister: () => void;

function find<T extends Element>(selector: string, type: new () => T): T {
  const element = container.querySelector(selector);
  if (!(element instanceof type)) throw new Error(`missing ${selector}`);
  return element;
}

function setState(patch: Partial<AppState>) {
  act(() => useAppStore.setState(patch));
}

function press(input: HTMLInputElement, key: string) {
  act(() => {
    input.focus();
    input.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  unregister = registerCommands(APP_COMMANDS);
  useAppStore.setState({
    ready: true,
    notes: [
      { ...NOTE, id: "a.md", title: "a", tags: ["one", "two"] },
      { ...NOTE, id: "b.txt", title: "b", format: "txt", tags: [] },
    ],
    activeId: "a.md",
    content: CONTENT,
    savedContent: CONTENT,
    settings: parseSettings({ viewMode: "split" }),
  });
  container = document.body.appendChild(document.createElement("div"));
  root = createRoot(container);
  act(() => root.render(<EditorPane />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  unregister();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("shows the empty state with the keys that are bound right now", () => {
  setState({ activeId: null, content: "", savedContent: "" });
  expect(container.textContent).toContain("No note is open");
  expect(container.textContent).toContain("Ctrl+N");
  setState({ settings: parseSettings({ keybindings: { "note.new": "Ctrl+J" } }) });
  expect(container.textContent).toContain("Ctrl+J");
  expect(container.textContent).not.toContain("Ctrl+N");
});

it("shows editor and preview in split view", () => {
  expect(find("input[type=text]", HTMLInputElement).value).toBe("a");
  expect(find(".cm-content", HTMLElement).textContent).toContain("# Heading");
  expect(find(".ks-prose h1", HTMLElement).textContent).toBe("Heading");
});

it("hides the editor in preview mode, but never for a plain-text note", () => {
  setState({ settings: parseSettings({ viewMode: "preview" }) });
  expect(find(".ks-editor", HTMLElement).hidden).toBe(true);
  expect(container.querySelector(".ks-prose")).not.toBeNull();
  setState({ activeId: "b.txt", content: "plain", savedContent: "plain" });
  expect(find(".ks-editor", HTMLElement).hidden).toBe(false);
  expect(container.querySelector(".ks-prose")).toBeNull();
});

it("copies a preview link instead of following it", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  const click = new MouseEvent("click", { bubbles: true, cancelable: true });
  find(".ks-prose a", HTMLAnchorElement).dispatchEvent(click);
  expect(click.defaultPrevented).toBe(true);
  expect(writeText).toHaveBeenCalledWith("https://example.com");
  await vi.waitFor(() => expect(useAppStore.getState().toast?.message).toContain("Link copied"));
});

it("renames on Enter only when the title really changed", () => {
  const title = find("input[type=text]", HTMLInputElement);
  press(title, "Enter");
  title.value = "   ";
  press(title, "Enter");
  expect(renameNote).not.toHaveBeenCalled();
  expect(title.value).toBe("a");
  title.value = "typo";
  press(title, "Escape");
  expect(renameNote).not.toHaveBeenCalled();
  title.value = " better ";
  press(title, "Enter");
  expect(renameNote).toHaveBeenCalledExactlyOnceWith("a.md", "better");
});

it("adds tags on Enter or comma and removes the last on Backspace", () => {
  const tags = find("ul[aria-label=Tags] input", HTMLInputElement);
  tags.value = "#Three, four";
  press(tags, "Enter");
  expect(setNoteTags).toHaveBeenLastCalledWith("a.md", ["one", "two", "Three", "four"]);
  expect(tags.value).toBe("");
  press(tags, "Backspace");
  expect(setNoteTags).toHaveBeenLastCalledWith("a.md", ["one"]);
  act(() => find("button[aria-label='Remove tag one']", HTMLButtonElement).click());
  expect(setNoteTags).toHaveBeenLastCalledWith("a.md", ["two"]);
});
