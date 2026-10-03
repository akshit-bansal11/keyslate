/** Joins class names, skipping falsy ones. A caller's className goes last so it wins. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
