import { z } from "zod";
import { noteFormatSchema } from "@/lib/backend/note-schemas";

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);

/** The semantic colour roles. Each one becomes a `--ks-<role>` custom property. */
export const themeColorsSchema = z.object({
  bg: hex,
  surface: hex,
  raised: hex,
  border: hex,
  text: hex,
  muted: hex,
  accent: hex,
  accentFg: hex,
  danger: hex,
});

export const themeSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(40),
  scheme: z.enum(["dark", "light"]),
  colors: themeColorsSchema,
});

export const FONT_SIZE = { min: 11, max: 28, fallback: 15 } as const;
export const LINE_HEIGHT = { min: 1.2, max: 2.2, fallback: 1.6 } as const;
/** In `ch`. Zero means the editor uses the full width. */
export const LINE_WIDTH = { min: 0, max: 160, fallback: 80 } as const;

/**
 * Every field carries its own `.catch`, so one bad value in a hand-edited
 * settings.json resets that field alone instead of discarding the whole file.
 */
export const settingsSchema = z.object({
  /** Read by Rust to locate the vault; the UI only round-trips it. */
  vaultPath: z.string().optional().catch(undefined),
  themeId: z.string().catch("slate"),
  customThemes: z.array(themeSchema).catch([]),
  editorFont: z.enum(["mono", "sans", "serif"]).catch("mono"),
  fontSize: z.number().int().min(FONT_SIZE.min).max(FONT_SIZE.max).catch(FONT_SIZE.fallback),
  lineHeight: z.number().min(LINE_HEIGHT.min).max(LINE_HEIGHT.max).catch(LINE_HEIGHT.fallback),
  lineWidth: z.number().int().min(LINE_WIDTH.min).max(LINE_WIDTH.max).catch(LINE_WIDTH.fallback),
  density: z.enum(["compact", "comfortable"]).catch("comfortable"),
  viewMode: z.enum(["edit", "split", "preview"]).catch("edit"),
  sidebarVisible: z.boolean().catch(true),
  lineNumbers: z.boolean().catch(false),
  wordWrap: z.boolean().catch(true),
  spellcheck: z.boolean().catch(false),
  pasteHtmlAsMarkdown: z.boolean().catch(true),
  defaultFormat: noteFormatSchema.catch("md"),
  sort: z.enum(["modified", "title"]).catch("modified"),
  /** Command id to key combo. An empty string means "deliberately unbound". */
  keybindings: z.record(z.string(), z.string()).catch({}),
  globalShortcut: z.string().nullable().catch("Ctrl+Alt+N"),
});

export type ThemeColors = z.infer<typeof themeColorsSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type ViewMode = Settings["viewMode"];

export function parseSettings(raw: unknown): Settings {
  return settingsSchema.parse(typeof raw === "object" && raw !== null ? raw : {});
}
