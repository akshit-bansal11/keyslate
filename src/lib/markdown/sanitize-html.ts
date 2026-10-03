import createDOMPurify, { type Config } from "dompurify";

/**
 * One allow-list for every piece of HTML that did not originate in this app:
 * rendered Markdown (which may embed raw HTML) and pasted clipboard content.
 * Event-handler attributes are dropped by DOMPurify's default attribute list.
 */
const CONFIG = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: [
    "style",
    "script",
    "iframe",
    "form",
    "object",
    "embed",
    "video",
    "audio",
    "source",
    "track",
    "button",
    "select",
    "textarea",
  ],
  // `class` and `id` would let a note borrow the app's own styles or shadow its elements.
  FORBID_ATTR: ["style", "class", "id", "srcset"],
  // http, https, mailto, or no scheme at all. DOMPurify separately allows `data:` on images.
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
} satisfies Config;

const purify = createDOMPurify(window);

// The only input a note may show is a task-list checkbox, and it is never live.
purify.addHook("afterSanitizeAttributes", (node) => {
  if (!(node instanceof HTMLInputElement)) return;
  if (node.type === "checkbox") node.disabled = true;
  else node.remove();
});

export function sanitizeHtml(html: string): string {
  return purify.sanitize(html, CONFIG);
}

export function sanitizeToFragment(html: string): DocumentFragment {
  return purify.sanitize(html, { ...CONFIG, RETURN_DOM_FRAGMENT: true });
}
