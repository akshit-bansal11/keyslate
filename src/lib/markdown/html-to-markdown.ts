import TurndownService from "turndown";
import { sanitizeToFragment } from "@/lib/markdown/sanitize-html";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",
  hr: "---",
});

turndown.addRule("strikethrough", {
  filter: ["del", "s"],
  replacement: (content) => `~~${content}~~`,
});

/** Markdown for a piece of HTML, such as clipboard content. The HTML is sanitised first. */
export function htmlToMarkdown(html: string): string {
  return turndown.turndown(sanitizeToFragment(html));
}
