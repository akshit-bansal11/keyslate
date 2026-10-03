import { openSearchPanel } from "@codemirror/search";
import type { EditorView } from "@codemirror/view";
import type { Command } from "@/lib/commands/registry";
import { activeFormat } from "@/lib/editor/active-note";
import { getEditorView } from "@/lib/editor/editor-instance";
import {
  cycleHeading,
  formatDate,
  type TextEdit,
  toggleCodeBlock,
  toggleLink,
  toggleList,
  toggleQuote,
  toggleTask,
  toggleWrap,
} from "@/lib/editor/format-text";
import { armPlainPaste } from "@/lib/editor/paste";
import { useAppStore } from "@/lib/store/app-store";
import { notify } from "@/lib/store/ui-actions";

/** The parts of the editor pane a command may need to reach. Each is null while not shown. */
export interface EditorPaneHandles {
  title: () => HTMLInputElement | null;
  tags: () => HTMLInputElement | null;
  preview: () => HTMLElement | null;
}

type Transform = (doc: string, from: number, to: number) => TextEdit | null;

const NO_NOTE = "Open a note first.";

const isMarkdown = () => activeFormat(useAppStore.getState()) === "md";

/** The editor, unless it is absent or hidden behind the preview. */
function visibleEditor(): EditorView | null {
  const view = getEditorView();
  return view && !view.dom.closest("[hidden]") ? view : null;
}

/** The editor to change, or a message saying why there is none. */
function editableEditor(): EditorView | null {
  const view = visibleEditor();
  if (view) return view;
  notify(
    useAppStore.getState().activeId === null
      ? NO_NOTE
      : "The note is in preview. Switch to the editor to change it.",
  );
  return null;
}

function insert(view: EditorView, text: string) {
  view.dispatch(view.state.replaceSelection(text), { scrollIntoView: true, userEvent: "input" });
  view.focus();
}

/** Runs a Markdown transform on the selection. Says so in a plain-text note, where markers are only noise. */
function format(transform: Transform) {
  return () => {
    const view = editableEditor();
    if (!view) return;
    if (!isMarkdown()) {
      notify("Formatting works in Markdown notes only.");
      return;
    }
    const { from, to } = view.state.selection.main;
    const edit = transform(view.state.doc.toString(), from, to);
    if (edit === null) {
      notify("There is no task on this line.");
      return;
    }
    view.dispatch({
      changes: { from: edit.from, to: edit.to, insert: edit.insert },
      selection: { anchor: edit.anchor, head: edit.head },
      scrollIntoView: true,
      userEvent: "input",
    });
    view.focus();
  };
}

const wrap = (marker: string) => format((doc, from, to) => toggleWrap(doc, from, to, marker));

function focusField(field: () => HTMLInputElement | null) {
  return () => {
    const input = field();
    if (!input) {
      notify(NO_NOTE);
      return;
    }
    input.focus();
    input.select();
  };
}

/** Commands that act on the editor pane. Registered by the pane, which supplies the handles. */
export function createEditorCommands(handles: EditorPaneHandles): Command[] {
  return [
    {
      id: "editor.focus",
      title: "Focus the editor",
      group: "Go",
      defaultKey: "Alt+E",
      run: () => {
        const target = visibleEditor() ?? handles.preview();
        if (target) target.focus();
        else notify(NO_NOTE);
      },
    },
    {
      id: "note.rename",
      title: "Rename note",
      group: "Note",
      defaultKey: "F2",
      run: focusField(handles.title),
    },
    {
      id: "note.editTags",
      title: "Edit tags",
      group: "Note",
      defaultKey: "Ctrl+T",
      run: focusField(handles.tags),
    },
    {
      id: "editor.find",
      title: "Find in note",
      group: "Edit",
      defaultKey: "Ctrl+F",
      run: () => {
        const view = editableEditor();
        if (view) openSearchPanel(view);
      },
    },
    { id: "editor.bold", title: "Bold", group: "Edit", defaultKey: "Ctrl+B", run: wrap("**") },
    { id: "editor.italic", title: "Italic", group: "Edit", defaultKey: "Ctrl+I", run: wrap("*") },
    {
      id: "editor.strikethrough",
      title: "Strikethrough",
      group: "Edit",
      defaultKey: "Ctrl+Shift+X",
      run: wrap("~~"),
    },
    {
      id: "editor.inlineCode",
      title: "Inline code",
      group: "Edit",
      defaultKey: "Ctrl+`",
      run: wrap("`"),
    },
    {
      id: "editor.link",
      title: "Link",
      group: "Edit",
      defaultKey: "Ctrl+L",
      run: format(toggleLink),
    },
    {
      id: "editor.heading",
      title: "Cycle heading level",
      group: "Edit",
      defaultKey: "Ctrl+H",
      run: format(cycleHeading),
    },
    {
      id: "editor.bulletList",
      title: "Bulleted list",
      group: "Edit",
      defaultKey: "Ctrl+Shift+8",
      run: format((doc, from, to) => toggleList(doc, from, to, "bullet")),
    },
    {
      id: "editor.numberedList",
      title: "Numbered list",
      group: "Edit",
      defaultKey: "Ctrl+Shift+7",
      run: format((doc, from, to) => toggleList(doc, from, to, "numbered")),
    },
    {
      id: "editor.taskList",
      title: "Task list",
      group: "Edit",
      defaultKey: "Ctrl+Shift+9",
      run: format((doc, from, to) => toggleList(doc, from, to, "task")),
    },
    {
      id: "editor.toggleTask",
      title: "Check or uncheck task",
      group: "Edit",
      defaultKey: "Ctrl+Enter",
      run: format(toggleTask),
    },
    {
      id: "editor.quote",
      title: "Quote",
      group: "Edit",
      defaultKey: "Ctrl+Shift+.",
      run: format(toggleQuote),
    },
    {
      id: "editor.codeBlock",
      title: "Code block",
      group: "Edit",
      defaultKey: "Ctrl+Shift+`",
      run: format(toggleCodeBlock),
    },
    {
      id: "editor.insertDate",
      title: "Insert today's date",
      group: "Edit",
      defaultKey: "Alt+D",
      run: () => {
        const view = editableEditor();
        if (view) insert(view, formatDate(new Date()));
      },
    },
    {
      id: "editor.pastePlain",
      title: "Paste as plain text next",
      group: "Edit",
      defaultKey: "Ctrl+Shift+V",
      run: () => {
        const view = editableEditor();
        if (!view) return;
        if (!isMarkdown()) {
          notify("A plain-text note always pastes plain text.");
          return;
        }
        armPlainPaste();
        view.focus();
        notify("The next paste will be plain text.");
      },
    },
  ];
}
