import type { ListView } from "@/lib/store/app-store";

export const VIEWS: readonly { id: ListView; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pinned", label: "Pinned" },
  { id: "trash", label: "Trash" },
];

/** Names the listbox, so a screen reader says which list it is in. */
export const VIEW_LIST_LABEL: Record<ListView, string> = {
  all: "All notes",
  pinned: "Pinned notes",
  trash: "Trash",
};

/** Used in "No … match" when a filter leaves nothing. */
export const VIEW_NOUN: Record<ListView, string> = {
  all: "notes",
  pinned: "pinned notes",
  trash: "trashed notes",
};

/** Tags shown on one row; the rest are still matched by the filter. */
export const MAX_ROW_TAGS = 3;

/** Rows moved by PageUp/PageDown when the row height cannot be measured. */
export const FALLBACK_PAGE = 10;

export const NOW_REFRESH_MS = 60_000;

/** One skeleton row per entry; the widths vary so it does not read as a table. */
export const SKELETON_TITLE_WIDTHS = [
  "w-2/3",
  "w-1/2",
  "w-3/4",
  "w-2/5",
  "w-3/5",
  "w-1/3",
] as const;
