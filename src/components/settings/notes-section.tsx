import { ChoiceGroup } from "@/components/settings/choice-group";
import { CommandButton } from "@/components/settings/command-button";
import {
  FORMAT_CHOICES,
  SETTINGS_SECTIONS,
  SORT_CHOICES,
} from "@/components/settings/settings-constants";
import { SettingsSection } from "@/components/settings/settings-section";
import { useIsNative } from "@/hooks/settings/use-is-native";
import { useAppStore } from "@/lib/store/app-store";
import { updateSettings } from "@/lib/store/ui-actions";

export function NotesSection() {
  const defaultFormat = useAppStore((state) => state.settings.defaultFormat);
  const sort = useAppStore((state) => state.settings.sort);
  const vaultPath = useAppStore((state) => state.vaultPath);
  const native = useIsNative();

  return (
    <SettingsSection section={SETTINGS_SECTIONS.notes}>
      <ChoiceGroup
        legend="Format for new notes"
        name="settings-default-format"
        value={defaultFormat}
        options={FORMAT_CHOICES}
        onChange={(value) => updateSettings({ defaultFormat: value })}
      />
      <ChoiceGroup
        legend="Sort the note list by"
        name="settings-sort"
        value={sort}
        options={SORT_CHOICES}
        onChange={(value) => updateSettings({ sort: value })}
      />
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-muted text-sm">Vault folder</span>
          <input type="text" className="ks-input font-mono text-sm" value={vaultPath} readOnly />
        </label>
        {native ? null : (
          <p className="text-muted text-sm">
            This is the browser preview, so notes are kept in memory and are not saved to disk. The
            folder buttons work in the Keyslate app.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <CommandButton commandId="vault.change" disabled={!native}>
            Change folder
          </CommandButton>
          <CommandButton commandId="vault.reveal" disabled={!native}>
            Open in Explorer
          </CommandButton>
        </div>
      </div>
    </SettingsSection>
  );
}
