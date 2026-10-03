import { describe, expect, it } from "vitest";
import { fuzzyRank, fuzzyScore } from "@/lib/command-ui/fuzzy";

const TITLES = [
  "Pin or unpin note",
  "Next note",
  "New plain-text note",
  "Duplicate note",
  "New note",
  "Open settings",
];

const rank = (query: string) => fuzzyRank(TITLES, query, (title) => [title]);

describe("fuzzyScore", () => {
  it("is zero when the letters are not there in order", () => {
    expect(fuzzyScore("New note", "wen")).toBe(0);
    expect(fuzzyScore("New note", "xyz")).toBe(0);
  });

  it("ranks a word start above a mid-word hit", () => {
    expect(fuzzyScore("Open settings", "s")).toBeGreaterThan(fuzzyScore("Next note", "x"));
  });
});

describe("fuzzyRank", () => {
  it.each(["nn", "new", "NEW", "new note"])('puts "New note" first for "%s"', (query) => {
    expect(rank(query)[0]).toBe("New note");
  });

  it("drops what does not match and keeps the order for an empty query", () => {
    expect(rank("sett")).toEqual(["Open settings"]);
    expect(rank("  ")).toEqual(TITLES);
  });

  it("matches secondary texts, below a title hit", () => {
    const notes = [
      { title: "Groceries", tags: ["work"] },
      { title: "Work log", tags: [] },
      { title: "Recipes", tags: [] },
    ];
    const ranked = fuzzyRank(notes, "work", (note) => [note.title, ...note.tags]);
    expect(ranked.map((note) => note.title)).toEqual(["Work log", "Groceries"]);
  });
});
