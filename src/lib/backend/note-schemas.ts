import { z } from "zod";

export const noteFormatSchema = z.enum(["md", "txt"]);

export const noteMetaSchema = z.object({
  /** File name inside the vault, extension included. Doubles as the identity. */
  id: z.string(),
  /** File stem. Renaming a note renames the file. */
  title: z.string(),
  format: noteFormatSchema,
  pinned: z.boolean(),
  tags: z.array(z.string()),
  /** Milliseconds since the epoch. */
  modified: z.number(),
  size: z.number(),
});

export const noteSchema = noteMetaSchema.extend({ content: z.string() });

export const searchHitSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** 1-based; 0 when only the title matched. */
  line: z.number(),
  snippet: z.string(),
});

export const textFileSchema = z.object({ name: z.string(), content: z.string() });

export type NoteFormat = z.infer<typeof noteFormatSchema>;
export type NoteMeta = z.infer<typeof noteMetaSchema>;
export type Note = z.infer<typeof noteSchema>;
export type SearchHit = z.infer<typeof searchHitSchema>;
export type TextFile = z.infer<typeof textFileSchema>;
