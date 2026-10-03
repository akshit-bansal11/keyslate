/**
 * Markdown formatting as pure string transforms, so they can be tested without
 * an editor. Each takes the whole document and the selection, and returns one
 * replacement plus the selection to leave behind.
 */

/** `anchor` and `head` are offsets in the document after the replacement. */
export interface TextEdit {
  from: number;
  to: number;
  insert: string;
  anchor: number;
  head: number;
}

export type ListKind = "bullet" | "numbered" | "task";

const FENCE = "```";
const HEADING_CYCLE_MAX = 3;
const LINK = /^\[([^\]]*)\]\([^)]*\)$/;
const URL = /^(?:https?:\/\/|mailto:)\S+$/;
const LIST_LINE = /^(\s*)(?:([-*+]|\d+[.)])[ \t]+(\[[ xX]\][ \t]+)?)?(.*)$/;
const QUOTE = /^\s*>[ \t]?/;
const HEADING = /^(#{1,6})(?:[ \t]+|$)/;
const TASK = /^(\s*(?:[-*+]|\d+[.)])[ \t]+\[)([ xX])(\])/;

const LIST_PREFIX: Record<ListKind, (index: number) => string> = {
  bullet: () => "- ",
  numbered: (index) => `${index}. `,
  task: () => "- [ ] ",
};

function runLength(text: string, index: number, step: 1 | -1, char: string): number {
  let count = 0;
  for (let i = index; text[i] === char; i += step) count += 1;
  return count;
}

/** A lone `*` beside `**bold**` is not italic: italic is an odd run of stars. */
function hasMarker(run: number, marker: string): boolean {
  return marker === "*" ? run % 2 === 1 : run >= marker.length;
}

/** Wraps the selection in `marker`, or unwraps it when it already is. With no selection, leaves the caret between a new pair. */
export function toggleWrap(doc: string, from: number, to: number, marker: string): TextEdit {
  const size = marker.length;
  const char = marker.charAt(0);
  const inner = doc.slice(from, to);
  const before = runLength(doc, from - 1, -1, char);
  const after = runLength(doc, to, 1, char);
  if (hasMarker(before, marker) && hasMarker(after, marker)) {
    return {
      from: from - size,
      to: to + size,
      insert: inner,
      anchor: from - size,
      head: to - size,
    };
  }
  const leading = runLength(inner, 0, 1, char);
  const trailing = runLength(inner, inner.length - 1, -1, char);
  if (inner.length >= size * 2 && hasMarker(leading, marker) && hasMarker(trailing, marker)) {
    const text = inner.slice(size, inner.length - size);
    return { from, to, insert: text, anchor: from, head: from + text.length };
  }
  return { from, to, insert: marker + inner + marker, anchor: from + size, head: to + size };
}

/** Turns the selection into a link, or a selected link back into its text. */
export function toggleLink(doc: string, from: number, to: number): TextEdit {
  const inner = doc.slice(from, to);
  const link = LINK.exec(inner);
  if (link) {
    const text = link[1] ?? "";
    return { from, to, insert: text, anchor: from, head: from + text.length };
  }
  if (URL.test(inner)) {
    return { from, to, insert: `[](${inner})`, anchor: from + 1, head: from + 1 };
  }
  // With text selected the caret lands in the brackets for the address; otherwise in the label.
  const caret = inner === "" ? from + 1 : from + inner.length + 3;
  return { from, to, insert: `[${inner}]()`, anchor: caret, head: caret };
}

function lineRange(doc: string, from: number, to: number) {
  const start = doc.lastIndexOf("\n", from - 1) + 1;
  // A selection that ends at the very start of a line does not include that line.
  const last = to > from && doc[to - 1] === "\n" ? to - 1 : to;
  const next = doc.indexOf("\n", last);
  return { start, end: next === -1 ? doc.length : next };
}

function editLines(
  doc: string,
  from: number,
  to: number,
  transform: (lines: string[]) => string[],
): TextEdit {
  const { start, end } = lineRange(doc, from, to);
  const before = doc.slice(start, end);
  const insert = transform(before.split("\n")).join("\n");
  if (from === to) {
    // The caret keeps its distance from the end of the line, so typing carries on.
    const caret = Math.max(start, from + insert.length - before.length);
    return { from: start, to: end, insert, anchor: caret, head: caret };
  }
  return { from: start, to: end, insert, anchor: start, head: start + insert.length };
}

function parseListLine(raw: string) {
  const match = LIST_LINE.exec(raw);
  const marker = match?.[2];
  let kind: ListKind | null = null;
  if (match?.[3]) kind = "task";
  else if (marker) kind = /\d/.test(marker) ? "numbered" : "bullet";
  return { raw, indent: match?.[1] ?? "", text: match?.[4] ?? raw, kind };
}

/** Makes every selected line a list item of `kind`, or plain again when they all are. */
export function toggleList(doc: string, from: number, to: number, kind: ListKind): TextEdit {
  return editLines(doc, from, to, (lines) => {
    const parsed = lines.map(parseListLine);
    // Blank lines inside a selection stay blank; a single blank line gets a marker to type after.
    const targets = parsed.filter((line) => line.text !== "" || lines.length === 1);
    const remove = targets.every((line) => line.kind === kind);
    let index = 0;
    return parsed.map((line) => {
      if (!targets.includes(line)) return line.raw;
      if (remove) return line.indent + line.text;
      index += 1;
      return line.indent + LIST_PREFIX[kind](index) + line.text;
    });
  });
}

export function toggleQuote(doc: string, from: number, to: number): TextEdit {
  return editLines(doc, from, to, (lines) =>
    lines.every((line) => QUOTE.test(line))
      ? lines.map((line) => line.replace(QUOTE, ""))
      : lines.map((line) => (line === "" ? ">" : `> ${line}`)),
  );
}

/** None, then levels 1 to 3, then none again. Deeper headings go back to none. */
export function cycleHeading(doc: string, from: number, to: number): TextEdit {
  return editLines(doc, from, to, (lines) => {
    const level = HEADING.exec(lines[0] ?? "")?.[1]?.length ?? 0;
    const prefix = level >= HEADING_CYCLE_MAX ? "" : `${"#".repeat(level + 1)} `;
    return lines.map((line) =>
      line === "" && lines.length > 1 ? line : prefix + line.replace(HEADING, ""),
    );
  });
}

/** Checks every task on the selected lines, or unchecks them when all are done. Null when there is no task. */
export function toggleTask(doc: string, from: number, to: number): TextEdit | null {
  const { start, end } = lineRange(doc, from, to);
  const states = doc
    .slice(start, end)
    .split("\n")
    .flatMap((line) => TASK.exec(line)?.[2] ?? []);
  if (states.length === 0) return null;
  const box = states.includes(" ") ? "x" : " ";
  return editLines(doc, from, to, (lines) => lines.map((line) => line.replace(TASK, `$1${box}$3`)));
}

/** Fences the selected lines, or removes the fences when the selection starts and ends with them. */
export function toggleCodeBlock(doc: string, from: number, to: number): TextEdit {
  const { start, end } = lineRange(doc, from, to);
  const body = doc.slice(start, end);
  const lines = body.split("\n");
  if (lines.length >= 2 && lines[0]?.startsWith(FENCE) && lines.at(-1)?.trim() === FENCE) {
    const insert = lines.slice(1, -1).join("\n");
    return { from: start, to: end, insert, anchor: start, head: start + insert.length };
  }
  const insert = `${FENCE}\n${body}\n${FENCE}`;
  const bodyStart = start + FENCE.length + 1;
  if (from === to) {
    const caret = bodyStart + (from - start);
    return { from: start, to: end, insert, anchor: caret, head: caret };
  }
  return { from: start, to: end, insert, anchor: bodyStart, head: bodyStart + body.length };
}

/** Local calendar date as YYYY-MM-DD. */
export function formatDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
