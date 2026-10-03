import type { Settings, Theme } from "@/lib/settings/settings-schema";
import { BUILTIN_THEMES, DEFAULT_THEME } from "@/lib/themes/builtin-themes";

const EDITOR_FONTS = {
  mono: "var(--font-mono)",
  sans: "var(--font-sans)",
  serif: "var(--font-serif)",
} as const;

type ThemeChoice = Pick<Settings, "themeId" | "customThemes">;

/** Built-ins first, then the user's own, in the order the theme commands cycle through. */
export function allThemes(customThemes: readonly Theme[]): Theme[] {
  return [...BUILTIN_THEMES, ...customThemes];
}

/** The selected theme, or the default when its id no longer exists. */
export function resolveTheme({ themeId, customThemes }: ThemeChoice): Theme {
  return allThemes(customThemes).find((theme) => theme.id === themeId) ?? DEFAULT_THEME;
}

/** Writes the theme and the editor's typography onto the root element. */
export function applyAppearance(settings: Settings) {
  const root = document.documentElement;
  const theme = resolveTheme(settings);

  for (const [role, value] of Object.entries(theme.colors)) {
    const kebab = role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    root.style.setProperty(`--ks-${kebab}`, value);
  }
  // Native controls, scrollbars and the colour picker follow the painted theme.
  root.style.setProperty("color-scheme", theme.scheme);
  if (settings.density === "compact") root.setAttribute("data-density", "compact");
  else root.removeAttribute("data-density");

  root.style.setProperty("--ks-editor-font", EDITOR_FONTS[settings.editorFont]);
  root.style.setProperty("--ks-editor-size", `${settings.fontSize}px`);
  root.style.setProperty("--ks-editor-line-height", String(settings.lineHeight));
  const width = settings.lineWidth === 0 ? "none" : `${settings.lineWidth}ch`;
  root.style.setProperty("--ks-editor-width", width);
}
