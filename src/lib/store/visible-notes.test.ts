import { describe, expect, it } from "vitest";
import type { NoteMeta } from "@/lib/backend/note-schemas";
import { tagCounts, visibleNotes } from "@/lib/store/visible-notes";

const note = (title: string, extra: Partial<NoteMeta> = {}): NoteMeta => ({
  id: `${title}.md`,
  title,
  format: "md",
  pinned: false,
  tags: [],
  modified: 0,
  size: 0,
  ...extra,
});

const notes = [
  note("Beta", { modified: 3, tags: ["work"] }),
  note("alpha", { modified: 1, pinned: true }),
  note("Gamma", { modified: 2, tags: ["home", "work"] }),
];
const trash = [note("Old")];
const base = {
  notes,
  trash,
  view: "all",
  tagFilter: null,
  filterText: "",
  sort: "modified",
} as const;

const titles = (list: NoteMeta[]) => list.map((entry) => entry.title);

describe("visibleNotes", () => {
  it("puts pinned notes first, then newest first", () => {
    expect(titles(visibleNotes(base))).toEqual(["alpha", "Beta", "Gamma"]);
  });

  it("sorts by title without regard to case", () => {
    expect(titles(visibleNotes({ ...base, sort: "title" }))).toEqual(["alpha", "Beta", "Gamma"]);
    const unpinned = notes.map((entry) => ({ ...entry, pinned: false }));
    expect(titles(visibleNotes({ ...base, notes: unpinned, sort: "title" }))).toEqual([
      "alpha",
      "Beta",
      "Gamma",
    ]);
  });

  it("filters by view, tag, and text over titles and tags", () => {
    expect(titles(visibleNotes({ ...base, view: "pinned" }))).toEqual(["alpha"]);
    expect(titles(visibleNotes({ ...base, view: "trash" }))).toEqual(["Old"]);
    expect(titles(visibleNotes({ ...base, tagFilter: "work" }))).toEqual(["Beta", "Gamma"]);
    expect(titles(visibleNotes({ ...base, filterText: " GAM " }))).toEqual(["Gamma"]);
    expect(titles(visibleNotes({ ...base, filterText: "home" }))).toEqual(["Gamma"]);
  });

  it("does not reorder the array it was given", () => {
    visibleNotes(base);
    expect(titles(notes)).toEqual(["Beta", "alpha", "Gamma"]);
  });
});

describe("tagCounts", () => {
  it("counts each tag once per note, alphabetically", () => {
    expect(tagCounts(notes)).toEqual([
      { tag: "home", count: 1 },
      { tag: "work", count: 2 },
    ]);
  });
});
