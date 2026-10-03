import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentLess,
  indentMore,
} from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { getIndentUnit, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { highlightSelectionMatches, search, searchKeymap } from "@codemirror/search";
import {
  Compartment,
  type EditorSelection,
  EditorState,
  type Extension,
  type StateEffect,
} from "@codemirror/state";
import {
  type Command,
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { classHighlighter, tagHighlighter, tags } from "@lezer/highlight";
import type { NoteFormat } from "@/lib/backend/note-schemas";
import { editorTheme } from "@/lib/editor/editor-theme";
import { markdownPaste } from "@/lib/editor/paste";
import type { Settings } from "@/lib/settings/settings-schema";

export type EditorSettings = Pick<Settings, "wordWrap" | "lineNumbers" | "spellcheck">;

interface EditorStateOptions {
  doc: string;
  format: NoteFormat;
  settings: EditorSettings;
  selection?: EditorSelection;
  /** Wiring owned by the caller, such as the listener that reports edits. */
  extra: Extension;
}

const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s/;
/** Four spaces nest a list item under both "- " and "1. " markers. */
const INDENT = "    ";

/** Classes `classHighlighter` has no name for. All of them are styled in editor.css. */
const markdownHighlighter = tagHighlighter([
  { tag: tags.heading1, class: "tok-heading1" },
  { tag: tags.heading2, class: "tok-heading2" },
  { tag: tags.strikethrough, class: "tok-strikethrough" },
  { tag: tags.monospace, class: "tok-monospace" },
  { tag: tags.quote, class: "tok-quote" },
]);

const wrapping = new Compartment();
const gutter = new Compartment();
const spelling = new Compartment();

const wrappingOf = (settings: EditorSettings) => (settings.wordWrap ? EditorView.lineWrapping : []);
const gutterOf = (settings: EditorSettings) =>
  settings.lineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : [];
const spellingOf = (settings: EditorSettings) =>
  EditorView.contentAttributes.of({ spellcheck: String(settings.spellcheck) });

/** Tab indents a list item or a selection; anywhere else it inserts spaces at the caret. */
const indentOrInsert: Command = (view) => {
  const { state } = view;
  const range = state.selection.main;
  const line = state.doc.lineAt(range.head);
  if (!range.empty || LIST_ITEM.test(line.text)) return indentMore(view);
  const unit = getIndentUnit(state);
  const spaces = unit - ((range.head - line.from) % unit);
  view.dispatch(state.replaceSelection(" ".repeat(spaces)), {
    scrollIntoView: true,
    userEvent: "input",
  });
  return true;
};

/** Effects that bring an existing editor in line with changed settings, without rebuilding it. */
export function settingsEffects(settings: EditorSettings): StateEffect<unknown>[] {
  return [
    wrapping.reconfigure(wrappingOf(settings)),
    gutter.reconfigure(gutterOf(settings)),
    spelling.reconfigure(spellingOf(settings)),
  ];
}

/**
 * A complete editor state for one note. Each note gets its own, so undo
 * history never crosses notes.
 *
 * App shortcuts are not bound here: the global key handler runs first and
 * stops the event, so a second binding would only be dead weight. Escape
 * followed by Tab still leaves the editor, which is CodeMirror's built-in way
 * out of a Tab-indenting editor.
 */
export function createEditorState({ doc, format, settings, selection, extra }: EditorStateOptions) {
  return EditorState.create({
    doc,
    selection,
    extensions: [
      format === "md" ? [markdown({ base: markdownLanguage }), closeBrackets(), markdownPaste] : [],
      history(),
      drawSelection(),
      highlightSpecialChars(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      search({ top: true }),
      indentUnit.of(INDENT),
      syntaxHighlighting(classHighlighter),
      syntaxHighlighting(markdownHighlighter),
      wrapping.of(wrappingOf(settings)),
      gutter.of(gutterOf(settings)),
      spelling.of(spellingOf(settings)),
      EditorView.contentAttributes.of({ "aria-label": "Note text" }),
      keymap.of([
        { key: "Tab", run: indentOrInsert, shift: indentLess },
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
      ]),
      editorTheme,
      extra,
    ],
  });
}
