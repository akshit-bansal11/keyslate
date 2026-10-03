import { EditorView } from "@codemirror/view";

const mix = (role: string, percent: number) =>
  `color-mix(in srgb, var(--ks-${role}) ${percent}%, transparent)`;

const CONTROL = {
  minHeight: "calc(var(--spacing) * 7)",
  border: "1px solid var(--ks-border)",
  borderRadius: "var(--radius-control)",
  color: "var(--ks-text)",
  fontSize: "inherit",
};

/**
 * CodeMirror's own chrome. It lives here rather than in editor.css because a
 * theme extension is the only way to be sure of outranking CodeMirror's
 * built-in light and dark colours. Every colour is an app custom property, so
 * a theme change needs no editor code.
 */
export const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "var(--ks-bg)",
    color: "var(--ks-text)",
    fontSize: "var(--ks-editor-size)",
  },
  // The caret and the active line show focus; an outline around the whole pane would only add noise.
  "&.cm-focused": { outline: "none" },
  "&.cm-focused .cm-activeLine": { backgroundColor: mix("text", 5) },
  ".cm-activeLine": { backgroundColor: "transparent" },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "var(--ks-editor-font)",
    lineHeight: "var(--ks-editor-line-height)",
    // Centres the text column. A width of `none` makes this invalid, which falls back to no padding.
    paddingInline: "max(0px, calc((100% - var(--ks-editor-width)) / 2))",
  },
  ".cm-content": { padding: "calc(var(--spacing) * 4) 0" },
  ".cm-line": { padding: "0 calc(var(--spacing) * 5)" },
  ".cm-cursor, .cm-dropCursor": { borderLeft: "2px solid var(--ks-accent)" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground":
    { backgroundColor: mix("accent", 30) },
  ".cm-selectionMatch": { backgroundColor: mix("text", 12) },
  ".cm-searchMatch": {
    backgroundColor: mix("accent", 20),
    outline: `1px solid ${mix("accent", 55)}`,
  },
  ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: mix("accent", 50) },
  ".cm-specialChar": { color: "var(--ks-danger)" },
  ".cm-gutters": {
    border: "none",
    backgroundColor: "transparent",
    color: "var(--ks-muted)",
  },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--ks-text)" },
  ".cm-panels": {
    backgroundColor: "var(--ks-surface)",
    color: "var(--ks-text)",
    fontFamily: "var(--font-sans)",
    fontSize: "var(--text-sm)",
  },
  ".cm-panels.cm-panels-top": { borderBottom: "1px solid var(--ks-border)" },
  ".cm-panels.cm-panels-bottom": { borderTop: "1px solid var(--ks-border)" },
  ".cm-panel.cm-search": {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "calc(var(--spacing) * 1.5)",
    padding: "calc(var(--spacing) * 2)",
    paddingRight: "calc(var(--spacing) * 9)",
  },
  ".cm-panel.cm-search br": { display: "none" },
  ".cm-panel.cm-search label": {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--spacing)",
    color: "var(--ks-muted)",
    fontSize: "inherit",
  },
  ".cm-panel.cm-search input, .cm-panel.cm-search button": { margin: "0", fontSize: "inherit" },
  ".cm-panel.cm-search input[type=checkbox]": { accentColor: "var(--ks-accent)" },
  ".cm-textfield": {
    ...CONTROL,
    padding: "0 calc(var(--spacing) * 2)",
    backgroundColor: "var(--ks-raised)",
  },
  ".cm-button": {
    ...CONTROL,
    padding: "0 calc(var(--spacing) * 2.5)",
    backgroundColor: "transparent",
    backgroundImage: "none",
  },
  ".cm-button:hover": { backgroundColor: mix("text", 9) },
  ".cm-button:active": { backgroundColor: mix("text", 15), backgroundImage: "none" },
  ".cm-panel.cm-search [name=close]": {
    top: "calc(var(--spacing) * 2)",
    right: "calc(var(--spacing) * 2)",
    minWidth: "1.5rem",
    minHeight: "1.5rem",
    borderRadius: "var(--radius-control)",
    color: "var(--ks-muted)",
    fontSize: "var(--text-lg)",
    cursor: "pointer",
  },
  ".cm-panel.cm-search [name=close]:hover": { backgroundColor: mix("text", 9) },
});
