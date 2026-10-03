import { ChoiceGroup } from "@/components/settings/choice-group";
import {
  DENSITY_CHOICES,
  SCHEME_LABEL,
  SETTINGS_SECTIONS,
  SWATCH_PROPERTY,
  SWATCH_ROLES,
} from "@/components/settings/settings-constants";
import { SettingsSection } from "@/components/settings/settings-section";
import { useAppStore } from "@/lib/store/app-store";
import { updateSettings } from "@/lib/store/ui-actions";
import { allThemes, resolveTheme } from "@/lib/themes/apply-theme";

export function AppearanceSection() {
  const themeId = useAppStore((state) => state.settings.themeId);
  const customThemes = useAppStore((state) => state.settings.customThemes);
  const density = useAppStore((state) => state.settings.density);
  const current = resolveTheme({ themeId, customThemes });

  return (
    <SettingsSection section={SETTINGS_SECTIONS.appearance}>
      <fieldset className="min-w-0">
        <legend className="mb-1 text-muted text-sm">Theme</legend>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {allThemes(customThemes).map((theme) => (
            <label
              key={theme.id}
              className="flex min-w-0 flex-col gap-1.5 rounded-card border border-border p-2 hover:bg-hover has-checked:border-accent has-checked:bg-selected"
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="settings-theme"
                  className="accent-accent"
                  checked={theme.id === current.id}
                  onChange={() => updateSettings({ themeId: theme.id })}
                />
                <span className="min-w-0 truncate">{theme.name}</span>
              </span>
              <span className="text-muted text-xs">{SCHEME_LABEL[theme.scheme]}</span>
              <span
                aria-hidden="true"
                className="flex h-3 overflow-hidden rounded-control border border-border"
              >
                {SWATCH_ROLES.map((role) => (
                  <span
                    key={role}
                    className="ks-swatch-chip flex-1"
                    style={{ [SWATCH_PROPERTY]: theme.colors[role] }}
                  />
                ))}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <ChoiceGroup
        legend="Density"
        name="settings-density"
        value={density}
        options={DENSITY_CHOICES}
        onChange={(value) => updateSettings({ density: value })}
      />
    </SettingsSection>
  );
}
