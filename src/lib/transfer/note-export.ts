import type { NoteFormat } from "@/lib/backend/note-schemas";
import { markdownToHtml } from "@/lib/markdown/render-markdown";
import { EXPORT_STYLESHEET } from "@/lib/transfer/export-stylesheet";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}

/** A note as an HTML fragment: rendered Markdown, or plain text kept verbatim in a `<pre>`. */
export function noteToHtml(format: NoteFormat, content: string): string {
  return format === "md" ? markdownToHtml(content) : `<pre>${escapeHtml(content)}</pre>`;
}

/** A complete page that reads well on its own. `bodyHtml` must already be sanitised. */
export function buildHtmlDocument(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${EXPORT_STYLESHEET}</style>
</head>
<body>
${bodyHtml}
</body>
</html>
`;
}

/** The words of an HTML fragment with the markup gone and blank lines collapsed. */
export function htmlToPlainText(html: string): string {
  const body = new DOMParser().parseFromString(html, "text/html").body;
  for (const lineBreak of body.querySelectorAll("br")) lineBreak.replaceWith("\n");
  // ponytail: blocks are separated by whatever newlines the renderer emitted,
  // not by layout. Walk block elements instead if paragraphs start running together.
  return (body.textContent ?? "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function noteToPlainText(format: NoteFormat, content: string): string {
  return format === "md" ? htmlToPlainText(markdownToHtml(content)) : content;
}
