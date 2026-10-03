/**
 * Key combos are stored as "Ctrl+Shift+K": modifiers in the order Ctrl, Alt,
 * Shift, then one key name. Names come from `KeyboardEvent.code`, so a combo
 * means the same physical key whatever Shift does to the character.
 */

const NAMED_CODES: Record<string, string> = {
  Slash: "/",
  Comma: ",",
  Period: ".",
  Backslash: "\\",
  BracketLeft: "[",
  BracketRight: "]",
  Minus: "-",
  Equal: "=",
  Semicolon: ";",
  Quote: "'",
  Backquote: "`",
  Space: "Space",
  Enter: "Enter",
  Tab: "Tab",
  Backspace: "Backspace",
  Delete: "Delete",
  Insert: "Insert",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
};

const FUNCTION_KEY = /^F\d{1,2}$/;

function keyName(code: string): string | undefined {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (FUNCTION_KEY.test(code)) return code;
  return NAMED_CODES[code];
}

type KeyEventLike = Pick<KeyboardEvent, "code" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey">;

/** Null for a bare modifier press or a key this app does not bind. */
export function keyFromEvent(event: KeyEventLike): string | null {
  const name = keyName(event.code);
  if (!name) return null;
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  parts.push(name);
  return parts.join("+");
}

/**
 * A combo is safe to fire while the caret is in a text field only when plain
 * typing can never produce it: it has Ctrl or Alt, or it is a function key.
 */
export function firesWhileTyping(key: string): boolean {
  const parts = key.split("+");
  return parts.includes("Ctrl") || parts.includes("Alt") || FUNCTION_KEY.test(parts.at(-1) ?? "");
}

/** Tauri's global-shortcut plugin needs at least one of Ctrl or Alt to be useful system-wide. */
export function isGlobalAccelerator(key: string): boolean {
  const parts = key.split("+");
  return parts.includes("Ctrl") || parts.includes("Alt");
}
