/** Whitespace-separated runs. Good enough for a status bar; CJK text counts low. */
export function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}
