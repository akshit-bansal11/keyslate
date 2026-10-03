import type { Settings, Theme, ThemeColors } from "@/lib/settings/settings-schema";

export interface SectionInfo {
  /** Element id, and the target of the section link. */
  id: string;
  title: string;
}

interface Choice<T extends string> {
  value: T;
  label: string;
}

/** In page order. The section links are generated from this. */
export const SETTINGS_SECTIONS = {
  appearance: { id: "settings-appearance", title: "Appearance" },
  customThemes: { id: "settings-custom-themes", title: "Custom themes" },
  editor: { id: "settings-editor", title: "Editor" },
  notes: { id: "settings-notes", title: "Notes" },
  shortcuts: { id: "settings-shortcuts", title: "Shortcuts" },
  data: { id: "settings-data", title: "Data" },
} as const satisfies Record<string, SectionInfo>;

export const SCHEME_LABEL: Record<Theme["scheme"], string> = { dark: "Dark", light: "Light" };

/**
 * The custom property a preview chip reads its colour from (settings.css).
 * Typed as a plain string so it can key an inline style: React's style type
 * only lists standard properties.
 */
export const SWATCH_PROPERTY: string = "--ks-swatch";

/** The colours shown in a theme's preview strip, left to right. */
export const SWATCH_ROLES: readonly (keyof ThemeColors)[] = [
  "bg",
  "surface",
  "raised",
  "text",
  "muted",
  "accent",
];

/** Every colour role with what it paints, in the order the theme editor lists them. */
export const COLOR_ROLES: readonly { role: keyof ThemeColors; label: string }[] = [
  { role: "bg", label: "Editor background" },
  { role: "surface", label: "Sidebar and status bar" },
  { role: "raised", label: "Dialogs, menus and inputs" },
  { role: "border", label: "Borders and dividers" },
  { role: "text", label: "Main text" },
  { role: "muted", label: "Secondary text" },
  { role: "accent", label: "Accent: focus ring, selection, main button" },
  { role: "accentFg", label: "Text on the accent colour" },
  { role: "danger", label: "Warnings and destructive actions" },
];

export const DENSITY_CHOICES: readonly Choice<Settings["density"]>[] = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
];

export const FONT_CHOICES: readonly Choice<Settings["editorFont"]>[] = [
  { value: "mono", label: "Monospace" },
  { value: "sans", label: "Sans-serif" },
  { value: "serif", label: "Serif" },
];

export const FORMAT_CHOICES: readonly Choice<Settings["defaultFormat"]>[] = [
  { value: "md", label: "Markdown" },
  { value: "txt", label: "Plain text" },
];

export const SORT_CHOICES: readonly Choice<Settings["sort"]>[] = [
  { value: "modified", label: "Last edited" },
  { value: "title", label: "Title" },
];
