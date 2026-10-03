/**
 * Where a navigation key moves focus in a list of `count` rows, clamped to the
 * ends. Null when the key is not a navigation key.
 */
export function nextIndex(key: string, index: number, count: number, page: number): number | null {
  const last = count - 1;
  const clamp = (value: number) => Math.min(last, Math.max(0, value));
  switch (key) {
    case "ArrowDown":
      return clamp(index + 1);
    case "ArrowUp":
      return clamp(index - 1);
    case "PageDown":
      return clamp(index + page);
    case "PageUp":
      return clamp(index - page);
    case "Home":
      return 0;
    case "End":
      return last;
    default:
      return null;
  }
}
