import { describe, expect, it } from "vitest";
import { groupHits, splitSnippet } from "@/lib/command-ui/search-hits";

describe("splitSnippet", () => {
  it("marks every occurrence, whatever its case", () => {
    expect(splitSnippet("Tea, more tea", "TEA")).toEqual([
      { start: 0, text: "Tea", match: true },
      { start: 3, text: ", more ", match: false },
      { start: 10, text: "tea", match: true },
    ]);
  });

  it("treats the query as text, not as a pattern", () => {
    expect(splitSnippet("cost (a+b) today", "(a+b)").filter((part) => part.match)).toEqual([
      { start: 5, text: "(a+b)", match: true },
    ]);
  });

  it("returns the snippet whole when nothing matches", () => {
    expect(splitSnippet("plain line", "zzz")).toEqual([
      { start: 0, text: "plain line", match: false },
    ]);
    expect(splitSnippet("", "zzz")).toEqual([]);
  });
});

describe("groupHits", () => {
  it("groups by note and keeps the backend order", () => {
    const hit = (id: string, line: number) => ({ id, title: id, line, snippet: "" });
    const groups = groupHits([hit("b.md", 2), hit("a.md", 1), hit("b.md", 9)]);
    expect(groups.map((group) => [group.id, group.hits.map((entry) => entry.line)])).toEqual([
      ["b.md", [2, 9]],
      ["a.md", [1]],
    ]);
  });
});
