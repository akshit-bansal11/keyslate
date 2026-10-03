import { EditorView } from "@codemirror/view";
import { htmlToMarkdown } from "@/lib/markdown/html-to-markdown";
import { useAppStore } from "@/lib/store/app-store";

/** VS Code puts syntax-coloured HTML on the clipboard; converting it would mangle the code. */
const CODE_EDITOR_TYPE = "vscode-editor-data";

let plainNext = false;

/** Makes the next paste into a Markdown note skip the HTML conversion. One shot. */
export function armPlainPaste() {
  plainNext = true;
}

/**
 * Rich clipboard content becomes Markdown. Returning false hands the event to
 * CodeMirror, whose own paste inserts the plain-text flavour.
 */
export const markdownPaste = EditorView.domEventHandlers({
  paste(event, view) {
    const plain = plainNext;
    plainNext = false;
    const data = event.clipboardData;
    if (plain || !data || !useAppStore.getState().settings.pasteHtmlAsMarkdown) return false;
    if (data.types.includes(CODE_EDITOR_TYPE)) return false;
    const html = data.getData("text/html");
    const markdown = html ? htmlToMarkdown(html) : "";
    if (!markdown) return false;
    event.preventDefault();
    view.dispatch(view.state.replaceSelection(markdown), {
      scrollIntoView: true,
      userEvent: "input.paste",
    });
    return true;
  },
});
