import { getBackend } from "@/lib/backend/get-backend";
import type { Command } from "@/lib/commands/registry";
import type { Theme } from "@/lib/settings/settings-schema";
import { useAppStore } from "@/lib/store/app-store";
import { notify, updateSettings } from "@/lib/store/ui-actions";
import { allThemes, resolveTheme } from "@/lib/themes/apply-theme";
import { BUILTIN_THEMES } from "@/lib/themes/builtin-themes";
import { themeContrastIssues } from "@/lib/themes/contrast";
import { addCustomTheme } from "@/lib/themes/custom-themes";
import { parseThemeFile } from "@/lib/themes/theme-file";
import { safeFileName } from "@/lib/transfer/file-name";

const settings = () => useAppStore.getState().settings;

/** Also used for the user's own themes, registered by `useApplySettings`. */
export function themeSetCommand(theme: Theme): Command {
  return {
    id: `theme.set.${theme.id}`,
    title: `Theme: ${theme.name}`,
    group: "Theme",
    run: () => updateSettings({ themeId: theme.id }),
  };
}

function cycleTheme(step: 1 | -1) {
  const themes = allThemes(settings().customThemes);
  const index = themes.findIndex((theme) => theme.id === resolveTheme(settings()).id);
  const next = themes[(index + step + themes.length) % themes.length];
  if (!next) return;
  updateSettings({ themeId: next.id });
  notify(`Theme: ${next.name}`);
}

async function importTheme() {
  const [file] = await getBackend().openTextFiles(["json"]);
  if (!file) return;
  const takenIds = allThemes(settings().customThemes).map((theme) => theme.id);
  const result = parseThemeFile(file.content, takenIds);
  if ("error" in result) {
    notify(result.error, "error");
    return;
  }
  addCustomTheme(result.theme);
  const issues = themeContrastIssues(result.theme).length;
  notify(
    issues === 0
      ? `Imported the theme "${result.theme.name}".`
      : `Imported the theme "${result.theme.name}". Some of its colours are hard to read; Settings lists ${issues === 1 ? "the 1 pair" : `the ${issues} pairs`} to fix.`,
  );
}

async function exportTheme() {
  const theme = resolveTheme(settings());
  const name = `${safeFileName(theme.name)}.keyslate-theme.json`;
  const path = await getBackend().saveTextFile(name, `${JSON.stringify(theme, null, 2)}\n`);
  if (path !== null) notify(`Exported the theme to ${path}`);
}

export const THEME_COMMANDS: readonly Command[] = [
  {
    id: "theme.next",
    title: "Next theme",
    group: "Theme",
    defaultKey: "Ctrl+Alt+T",
    run: () => cycleTheme(1),
  },
  { id: "theme.previous", title: "Previous theme", group: "Theme", run: () => cycleTheme(-1) },
  ...BUILTIN_THEMES.map(themeSetCommand),
  { id: "theme.import", title: "Import theme from file", group: "Theme", run: importTheme },
  { id: "theme.export", title: "Export current theme to file", group: "Theme", run: exportTheme },
];
