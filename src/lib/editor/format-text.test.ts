import { describe, expect, it } from "vitest";
import {
  cycleHeading,
  formatDate,
  type TextEdit,
  toggleCodeBlock,
  toggleLink,
  toggleList,
  toggleQuote,
  toggleTask,
  toggleWrap,
} from "@/lib/editor/format-text";

/** Applies an edit and marks the resulting selection with `[` `]`, or `|` for a caret. */
function apply(doc: string, edit: TextEdit): string {
  const text = doc.slice(0, edit.from) + edit.insert + doc.slice(edit.to);
  const [a, b] = [Math.min(edit.anchor, edit.head), Math.max(edit.anchor, edit.head)];
  if (a === b) return `${text.slice(0, a)}|${text.slice(a)}`;
  return `${text.slice(0, a)}[${text.slice(a, b)}]${text.slice(b)}`;
}

describe("toggleWrap", () => {
  it("wraps a selection and keeps it selected", () => {
    expect(apply("a word b", toggleWrap("a word b", 2, 6, "**"))).toBe("a **[word]** b");
  });

  it("unwraps when the markers sit just outside the selection", () => {
    expect(apply("a **word** b", toggleWrap("a **word** b", 4, 8, "**"))).toBe("a [word] b");
  });

  it("unwraps when the markers are inside the selection", () => {
    expect(apply("a **word** b", toggleWrap("a **word** b", 2, 10, "**"))).toBe("a [word] b");
  });

  it("inserts a pair around the caret, and removes an empty pair", () => {
    expect(apply("ab", toggleWrap("ab", 1, 1, "`"))).toBe("a`|`b");
    expect(apply("a``b", toggleWrap("a``b", 2, 2, "`"))).toBe("a|b");
  });

  it("does not mistake bold for italic", () => {
    expect(apply("**word**", toggleWrap("**word**", 2, 6, "*"))).toBe("***[word]***");
    expect(apply("***word***", toggleWrap("***word***", 3, 7, "*"))).toBe("**[word]**");
  });
});

describe("toggleLink", () => {
  it("wraps text, wraps an address, and unwraps a link", () => {
    expect(apply("see docs", toggleLink("see docs", 4, 8))).toBe("see [docs](|)");
    expect(apply("https://a.b", toggleLink("https://a.b", 0, 11))).toBe("[|](https://a.b)");
    expect(apply("[docs](https://a.b)", toggleLink("[docs](https://a.b)", 0, 19))).toBe("[docs]");
    expect(apply("", toggleLink("", 0, 0))).toBe("[|]()");
  });
});

describe("toggleList", () => {
  const doc = "one\ntwo\n\nthree";

  it("adds and removes bullets on every selected line", () => {
    const bulleted = "- one\n- two\n\n- three";
    expect(apply(doc, toggleList(doc, 0, doc.length, "bullet"))).toBe(`[${bulleted}]`);
    expect(apply(bulleted, toggleList(bulleted, 0, bulleted.length, "bullet"))).toBe(`[${doc}]`);
  });

  it("numbers lines in order and converts between list kinds", () => {
    expect(apply(doc, toggleList(doc, 0, doc.length, "numbered"))).toBe(
      "[1. one\n2. two\n\n3. three]",
    );
    expect(apply("  1. one", toggleList("  1. one", 8, 8, "task"))).toBe("  - [ ] one|");
  });

  it("keeps the caret in place relative to the text", () => {
    expect(apply("one", toggleList("one", 1, 1, "bullet"))).toBe("- o|ne");
    expect(apply("", toggleList("", 0, 0, "task"))).toBe("- [ ] |");
  });

  it("leaves out a line the selection only touches at its start", () => {
    expect(apply("one\ntwo", toggleList("one\ntwo", 0, 4, "bullet"))).toBe("[- one]\ntwo");
  });
});

describe("toggleQuote", () => {
  it("quotes and unquotes", () => {
    expect(apply("a\n\nb", toggleQuote("a\n\nb", 0, 4))).toBe("[> a\n>\n> b]");
    expect(apply("> a\n>\n> b", toggleQuote("> a\n>\n> b", 0, 9))).toBe("[a\n\nb]");
  });
});

describe("cycleHeading", () => {
  it("steps through three levels and back to none", () => {
    expect(apply("title", cycleHeading("title", 5, 5))).toBe("# title|");
    expect(apply("# title", cycleHeading("# title", 7, 7))).toBe("## title|");
    expect(apply("### title", cycleHeading("### title", 9, 9))).toBe("title|");
    expect(apply("##### title", cycleHeading("##### title", 11, 11))).toBe("title|");
  });
});

describe("toggleTask", () => {
  it("checks and unchecks", () => {
    expect(apply("- [ ] a", toggleTask("- [ ] a", 7, 7) ?? fail())).toBe("- [x] a|");
    expect(apply("- [x] a", toggleTask("- [x] a", 7, 7) ?? fail())).toBe("- [ ] a|");
  });

  it("checks every task in a mixed selection and ignores other lines", () => {
    const doc = "- [x] a\ntext\n1. [ ] b";
    expect(apply(doc, toggleTask(doc, 0, doc.length) ?? fail())).toBe("[- [x] a\ntext\n1. [x] b]");
  });

  it("returns null when no selected line is a task", () => {
    expect(toggleTask("- a", 0, 3)).toBeNull();
  });
});

describe("toggleCodeBlock", () => {
  it("fences and unfences the selected lines", () => {
    expect(apply("a\nb", toggleCodeBlock("a\nb", 0, 3))).toBe("```\n[a\nb]\n```");
    const fenced = "```js\na\n```";
    expect(apply(fenced, toggleCodeBlock(fenced, 0, fenced.length))).toBe("[a]");
    expect(apply("", toggleCodeBlock("", 0, 0))).toBe("```\n|\n```");
  });
});

describe("formatDate", () => {
  it("pads the local date", () => {
    expect(formatDate(new Date(2026, 2, 7))).toBe("2026-03-07");
  });
});

function fail(): never {
  throw new Error("expected an edit");
}
