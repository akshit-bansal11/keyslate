import { ChoiceGroup } from "@/components/settings/choice-group";
import { NumberField } from "@/components/settings/number-field";
import { FONT_CHOICES, SETTINGS_SECTIONS } from "@/components/settings/settings-constants";
import { SettingsSection } from "@/components/settings/settings-section";
import { ToggleRow } from "@/components/settings/toggle-row";
import { FONT_SIZE, LINE_HEIGHT, LINE_WIDTH } from "@/lib/settings/settings-schema";
import { useAppStore } from "@/lib/store/app-store";
import { updateSettings } from "@/lib/store/ui-actions";

export function EditorSection() {
  const settings = useAppStore((state) => state.settings);
  const fullWidth = settings.lineWidth === 0;

  return (
    <SettingsSection section={SETTINGS_SECTIONS.editor}>
      <ChoiceGroup
        legend="Font"
        name="settings-editor-font"
        value={settings.editorFont}
        options={FONT_CHOICES}
        onChange={(editorFont) => updateSettings({ editorFont })}
      />
      <div className="flex flex-wrap gap-4">
        <NumberField
          label="Text size"
          value={settings.fontSize}
          min={FONT_SIZE.min}
          max={FONT_SIZE.max}
          onCommit={(fontSize) => updateSettings({ fontSize })}
        />
        <NumberField
          label="Line height"
          value={settings.lineHeight}
          min={LINE_HEIGHT.min}
          max={LINE_HEIGHT.max}
          step={0.1}
          onCommit={(lineHeight) => updateSettings({ lineHeight })}
        />
        {fullWidth ? null : (
          <NumberField
            label="Line width in characters"
            value={settings.lineWidth}
            // Zero is "full width", which the checkbox below owns.
            min={LINE_WIDTH.min + 1}
            max={LINE_WIDTH.max}
            onCommit={(lineWidth) => updateSettings({ lineWidth })}
          />
        )}
      </div>
      <div className="flex flex-col">
        <ToggleRow
          label="Full width: let lines run to the edge of the window"
          checked={fullWidth}
          onChange={(checked) => updateSettings({ lineWidth: checked ? 0 : LINE_WIDTH.fallback })}
        />
        <ToggleRow
          label="Wrap long lines"
          checked={settings.wordWrap}
          onChange={(wordWrap) => updateSettings({ wordWrap })}
        />
        <ToggleRow
          label="Show line numbers"
          checked={settings.lineNumbers}
          onChange={(lineNumbers) => updateSettings({ lineNumbers })}
        />
        <ToggleRow
          label="Check spelling"
          checked={settings.spellcheck}
          onChange={(spellcheck) => updateSettings({ spellcheck })}
        />
        <ToggleRow
          label="Convert pasted rich text to Markdown"
          checked={settings.pasteHtmlAsMarkdown}
          onChange={(pasteHtmlAsMarkdown) => updateSettings({ pasteHtmlAsMarkdown })}
        />
      </div>
    </SettingsSection>
  );
}
