import { Marked } from "marked";
import { sanitizeHtml, sanitizeToFragment } from "@/lib/markdown/sanitize-html";

const parser = new Marked({ gfm: true, breaks: false });

const parse = (source: string) => parser.parse(source, { async: false });

/** Sanitised HTML for a Markdown source. Safe to export or put on the clipboard. */
export function markdownToHtml(source: string): string {
  return sanitizeHtml(parse(source));
}

/**
 * Sanitised nodes for the in-app preview. The app's CSP blocks every network
 * request, so an image that is not embedded as `data:` is shown as its alt
 * text instead of a broken picture.
 */
export function markdownToFragment(source: string): DocumentFragment {
  const fragment = sanitizeToFragment(parse(source));
  for (const image of fragment.querySelectorAll("img")) {
    if (image.getAttribute("src")?.startsWith("data:")) continue;
    const note = document.createElement("span");
    note.className = "ks-image-note";
    note.textContent = image.alt || "Image not shown";
    note.title = "Keyslate works offline and does not load images from the network.";
    image.replaceWith(note);
  }
  return fragment;
}
