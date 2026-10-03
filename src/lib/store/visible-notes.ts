import type { NoteMeta } from "@/lib/backend/note-schemas";
import type { AppState } from "@/lib/store/app-store";

type ListInput = Pick<AppState, "notes" | "trash" | "view" | "tagFilter" | "filterText"> & {
  sort: AppState["settings"]["sort"];
};

function matches(note: NoteMeta, needle: string): boolean {
  return note.title.toLowerCase().includes(needle) || note.tags.some((tag) => tag.includes(needle));
}

/** The note list as the sidebar shows it: filtered, pinned first, then sorted. */
export function visibleNotes(input: ListInput): NoteMeta[] {
  const needle = input.filterText.trim().toLowerCase();
  const source = input.view === "trash" ? input.trash : input.notes;
  const byOrder =
    input.sort === "title"
      ? (a: NoteMeta, b: NoteMeta) =>
          a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
      : (a: NoteMeta, b: NoteMeta) => b.modified - a.modified;

  return source
    .filter((note) => input.view !== "pinned" || note.pinned)
    .filter((note) => input.tagFilter === null || note.tags.includes(input.tagFilter))
    .filter((note) => needle === "" || matches(note, needle))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || byOrder(a, b));
}

/** Every tag in use, alphabetical, with how many notes carry it. */
export function tagCounts(notes: NoteMeta[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const note of notes) {
    for (const tag of note.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}
