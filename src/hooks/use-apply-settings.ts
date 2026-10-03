import { useEffect, useLayoutEffect } from "react";
import { registerCommands } from "@/lib/commands/registry";
import { useAppStore } from "@/lib/store/app-store";
import { applyAppearance } from "@/lib/themes/apply-theme";
import { themeSetCommand } from "@/lib/themes/theme-commands";

/** Keeps the document's theme and editor typography in step with settings. Call once. */
export function useApplySettings() {
  const settings = useAppStore((state) => state.settings);
  const customThemes = settings.customThemes;

  // Layout effect, so a theme change paints once instead of flashing the old colours.
  useLayoutEffect(() => applyAppearance(settings), [settings]);

  // The user's own themes come and go, so their commands are registered here
  // rather than in the static list.
  useEffect(() => registerCommands(customThemes.map(themeSetCommand)), [customThemes]);
}
