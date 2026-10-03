import { Annotation, type ChangeSpec } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import type { NoteFormat } from "@/lib/backend/note-schemas";
import { activeFormat } from "@/lib/editor/active-note";
import { createEditorState, settingsEffects } from "@/lib/editor/editor-state";
import { type AppState, useAppStore } from "@/lib/store/app-store";
import { setContent } from "@/lib/store/note-actions";
import { setPendingLine } from "@/lib/store/ui-actions";

/** Marks a transaction that came from the store, so it is not reported back as typing. */
const fromStore = Annotation.define<boolean>();

let current: EditorView | null = null;

/** The mounted editor, if there is one. The app shows one note at a time, so there is at most one. */
export function getEditorView(): EditorView | null {
  return current;
}

/** The smallest replacement that turns `before` into `after`, so the caret survives a reload from disk. */
function minimalChange(before: string, after: string): ChangeSpec {
  const shortest = Math.min(before.length, after.length);
  let start = 0;
  while (start < shortest && before[start] === after[start]) start += 1;
  let end = 0;
  while (
    end < shortest - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  ) {
    end += 1;
  }
  return { from: start, to: before.length - end, insert: after.slice(start, after.length - end) };
}

function goToLine(view: EditorView, line: number) {
  const { doc } = view.state;
  const target = doc.line(Math.min(Math.max(line, 1), doc.lines));
  view.dispatch({
    selection: { anchor: target.from },
    effects: EditorView.scrollIntoView(target.from, { y: "center" }),
    annotations: fromStore.of(true),
  });
  view.focus();
}

/**
 * Keeps one editor and the store in step, entirely outside React: typing goes
 * to `setContent`, and a note switch, a change on disk, a settings change or a
 * pending line comes back in. Returns the function that stops it.
 */
function bindToStore(view: EditorView): () => void {
  let loadedId: string | null = null;
  let loadedFormat: NoteFormat | null = null;
  /** The text the editor and the store last agreed on. */
  let agreed = "";

  const listener = EditorView.updateListener.of((update) => {
    if (update.transactions.some((transaction) => transaction.annotation(fromStore))) return;
    if (update.docChanged) {
      agreed = update.state.doc.toString();
      setContent(agreed);
    }
    // A jump that was never followed by a note load ends once the user moves on.
    const movedOn =
      update.docChanged || update.selectionSet || (update.focusChanged && !update.view.hasFocus);
    if (movedOn && useAppStore.getState().pendingLine !== null) setPendingLine(null);
  });

  const sync = (state: AppState, previous: AppState) => {
    const format = activeFormat(state);
    const load = state.activeId !== loadedId || format !== loadedFormat;
    if (load) {
      // A rename or a format change gives the same text a new id; the caret stays where it was.
      const sameText = loadedId !== null && view.state.doc.toString() === state.content;
      view.setState(
        createEditorState({
          doc: state.content,
          format,
          settings: state.settings,
          selection: sameText ? view.state.selection : undefined,
          extra: listener,
        }),
      );
      loadedId = state.activeId;
      loadedFormat = format;
      agreed = state.content;
    } else if (state.content !== agreed) {
      agreed = state.content;
      view.dispatch({
        changes: minimalChange(view.state.doc.toString(), state.content),
        annotations: fromStore.of(true),
      });
    }
    if (!load && state.settings !== previous.settings) {
      view.dispatch({ effects: settingsEffects(state.settings) });
    }
    // The line may be set before the note it belongs to has loaded, or after.
    // It is applied in both cases and cleared once it has landed on a loaded note.
    if (state.pendingLine !== null && (load || state.pendingLine !== previous.pendingLine)) {
      goToLine(view, state.pendingLine);
      if (load) setPendingLine(null);
    }
  };

  const initial = useAppStore.getState();
  sync(initial, initial);
  return useAppStore.subscribe(sync);
}

/** Creates the editor inside `parent`. Returns the function that removes it. */
export function mountEditor(parent: HTMLElement): () => void {
  const view = new EditorView({ parent });
  const stop = bindToStore(view);
  current = view;
  return () => {
    stop();
    view.destroy();
    if (current === view) current = null;
  };
}
