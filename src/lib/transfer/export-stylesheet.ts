/*
 * The one place in the codebase where literal colours are allowed. An exported
 * HTML file is opened outside Keyslate, where none of the app's tokens exist,
 * so it has to carry its own. Light and dark are both written out, and both
 * pairs clear 4.5:1 for text.
 */
export const EXPORT_STYLESHEET = `
:root { color-scheme: light dark; --bg: #fbfaf7; --text: #24262b; --muted: #5a5f69; --line: #d6d3cb; --code: #f0eee8; --link: #1f5aa8; }
@media (prefers-color-scheme: dark) {
  :root { --bg: #16181d; --text: #e3e6ec; --muted: #a2a9b6; --line: #3a404c; --code: #20242c; --link: #8ab8f5; }
}
body { max-width: 44rem; margin: 0 auto; padding: 3rem 1.25rem; background: var(--bg); color: var(--text); font: 1rem/1.65 "Segoe UI", system-ui, -apple-system, sans-serif; overflow-wrap: break-word; }
h1, h2, h3, h4, h5, h6 { margin: 2em 0 0.5em; line-height: 1.25; }
h1 { margin-top: 0; }
a { color: var(--link); }
img { max-width: 100%; height: auto; }
hr { border: 0; border-top: 1px solid var(--line); margin: 2rem 0; }
code, pre { font-family: "Cascadia Code", Consolas, ui-monospace, monospace; font-size: 0.9em; }
code { padding: 0.1em 0.3em; border-radius: 0.25rem; background: var(--code); }
pre { padding: 1rem; border-radius: 0.5rem; background: var(--code); overflow-x: auto; white-space: pre-wrap; }
pre code { padding: 0; background: none; }
blockquote { margin: 1.25rem 0; padding: 0 1rem; border-left: 3px solid var(--line); color: var(--muted); }
table { border-collapse: collapse; margin: 1.25rem 0; }
th, td { padding: 0.4rem 0.75rem; border: 1px solid var(--line); text-align: left; }
th { background: var(--code); }
`;
