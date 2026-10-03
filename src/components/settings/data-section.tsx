import { CommandButton } from "@/components/settings/command-button";
import { SETTINGS_SECTIONS } from "@/components/settings/settings-constants";
import { SettingsSection } from "@/components/settings/settings-section";

export function DataSection() {
  return (
    <SettingsSection section={SETTINGS_SECTIONS.data}>
      <p className="selectable text-sm">
        Keyslate has no account, no sync and makes no network requests. Your notes are the files in
        the vault folder.
      </p>
      <div className="flex flex-wrap gap-2">
        <CommandButton commandId="import.notes">Import notes from files</CommandButton>
        <CommandButton commandId="vault.export">Export all notes to a folder</CommandButton>
        <CommandButton commandId="settings.export">Export settings</CommandButton>
        <CommandButton commandId="settings.import">Import settings</CommandButton>
      </div>
    </SettingsSection>
  );
}
