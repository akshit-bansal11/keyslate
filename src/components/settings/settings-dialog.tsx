import { X } from "lucide-react";
import { KeybindingEditor } from "@/components/command/keybinding-editor";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { CustomThemesSection } from "@/components/settings/custom-themes-section";
import { DataSection } from "@/components/settings/data-section";
import { EditorSection } from "@/components/settings/editor-section";
import { NotesSection } from "@/components/settings/notes-section";
import { SETTINGS_SECTIONS } from "@/components/settings/settings-constants";
import { SettingsSection } from "@/components/settings/settings-section";
import { Modal } from "@/components/ui/modal";
import { useAppStore } from "@/lib/store/app-store";
import { closeOverlay } from "@/lib/store/ui-actions";
import "@/styles/settings.css";

/** Every setting on one scrolling page. There is no Save button: each control applies at once. */
export function SettingsDialog() {
  const open = useAppStore((state) => state.overlay === "settings");

  return (
    <Modal open={open} onClose={closeOverlay} label="Settings" className="ks-modal-wide">
      <header className="flex shrink-0 items-center justify-between gap-4 border-border border-b px-5 py-3">
        <div>
          <h2 className="font-semibold text-lg">Settings</h2>
          <p className="text-muted text-sm">Changes apply as you make them.</p>
        </div>
        <button
          type="button"
          className="ks-button"
          aria-label="Close settings"
          title="Close settings"
          onClick={closeOverlay}
        >
          <X aria-hidden="true" focusable="false" className="size-4" />
        </button>
      </header>
      {/* The links sit outside the scrolling column, so they stay put without covering a focused control. */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav
          aria-label="Settings sections"
          className="shrink-0 border-border border-b px-3 py-2 md:w-44 md:border-r md:border-b-0 md:py-4"
        >
          <ul className="flex flex-wrap gap-x-1 md:flex-col">
            {Object.values(SETTINGS_SECTIONS).map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block rounded-control px-2 py-1 text-sm hover:bg-hover"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-5">
          <AppearanceSection />
          <CustomThemesSection />
          <EditorSection />
          <NotesSection />
          <SettingsSection section={SETTINGS_SECTIONS.shortcuts}>
            <KeybindingEditor />
          </SettingsSection>
          <DataSection />
        </div>
      </div>
    </Modal>
  );
}
