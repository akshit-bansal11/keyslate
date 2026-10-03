import { type Theme, themeSchema } from "@/lib/settings/settings-schema";
import { useAppStore } from "@/lib/store/app-store";
import { askConfirm, updateSettings } from "@/lib/store/ui-actions";
import { allThemes, resolveTheme } from "@/lib/themes/apply-theme";
import { DEFAULT_THEME } from "@/lib/themes/builtin-themes";
import { uniqueThemeId } from "@/lib/themes/theme-file";

const NAME_MAX = 40;

const settings = () => useAppStore.getState().settings;

/** Adds a theme to the user's own and selects it. */
export function addCustomTheme(theme: Theme) {
  updateSettings({ customThemes: [...settings().customThemes, theme], themeId: theme.id });
}

/** Copies the theme in use into an editable one and selects the copy. */
export function duplicateCurrentTheme() {
  const current = resolveTheme(settings());
  const takenIds = allThemes(settings().customThemes).map((theme) => theme.id);
  addCustomTheme({
    ...current,
    id: uniqueThemeId(`${current.id}-copy`, takenIds),
    name: `${current.name.slice(0, NAME_MAX - 5)} copy`,
  });
}

/**
 * Changes one custom theme. An edit that would make the theme invalid is
 * dropped: settings validation discards the whole custom list on one bad entry.
 */
export function updateCustomTheme(id: string, patch: Partial<Omit<Theme, "id">>) {
  const customThemes = settings().customThemes.map((theme) =>
    theme.id === id ? { ...theme, ...patch } : theme,
  );
  if (customThemes.every((theme) => themeSchema.safeParse(theme).success)) {
    updateSettings({ customThemes });
  }
}

export async function deleteCustomTheme(id: string) {
  const theme = settings().customThemes.find((entry) => entry.id === id);
  if (!theme) return;
  const confirmed = await askConfirm(
    `Delete the theme "${theme.name}"? This cannot be undone. Export it first to keep a copy.`,
    "Delete theme",
  );
  if (!confirmed) return;
  updateSettings({
    customThemes: settings().customThemes.filter((entry) => entry.id !== id),
    themeId: settings().themeId === id ? DEFAULT_THEME.id : settings().themeId,
  });
}
