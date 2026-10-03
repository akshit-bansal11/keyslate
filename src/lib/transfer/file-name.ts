const FALLBACK = "Untitled";

/** A name Windows will accept in a save dialog: no reserved characters, no trailing dot. */
export function safeFileName(name: string): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\p{Cc}]/gu, " ")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/, "")
    .trim();
  return cleaned || FALLBACK;
}
