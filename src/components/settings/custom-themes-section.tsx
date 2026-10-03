import { CommandButton } from "@/components/settings/command-button";
import { CustomThemeEditor } from "@/components/settings/custom-theme-editor";
import { SETTINGS_SECTIONS } from "@/components/settings/settings-constants";
import { SettingsSection } from "@/components/settings/settings-section";
import { useAppStore } from "@/lib/store/app-store";
import { resolveTheme } from "@/lib/themes/apply-theme";
import { duplicateCurrentTheme } from "@/lib/themes/custom-themes";

export function CustomThemesSection() {
  const themeId = useAppStore((state) => state.settings.themeId);
  const customThemes = useAppStore((state) => state.settings.customThemes);
  const current = resolveTheme({ themeId, customThemes });
  const editable = customThemes.includes(current);

  return (
    <SettingsSection section={SETTINGS_SECTIONS.customThemes}>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="ks-button" onClick={duplicateCurrentTheme}>
          Duplicate current theme to customise
        </button>
        <CommandButton commandId="theme.import">Import theme</CommandButton>
        <CommandButton commandId="theme.export">Export current theme</CommandButton>
      </div>
      {editable ? (
        // Keyed, so switching themes resets the name field to the new theme's name.
        <CustomThemeEditor key={current.id} theme={current} />
      ) : (
        <p className="text-muted text-sm">
          {current.name} is a built-in theme and cannot be changed. Duplicate it to make your own.
        </p>
      )}
    </SettingsSection>
  );
}
