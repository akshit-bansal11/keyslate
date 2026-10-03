import type { NoteFormat } from "@/lib/backend/note-schemas";

export const FORMAT_LABEL = { md: "Markdown", txt: "Plain text" } as const satisfies Record<
  NoteFormat,
  string
>;
