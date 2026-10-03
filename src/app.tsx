import { useEffect } from "react";
import { CommandPalette } from "@/components/command/command-palette";
import { QuickOpen } from "@/components/command/quick-open";
import { ShortcutSheet } from "@/components/command/shortcut-sheet";
import { EditorPane } from "@/components/editor/editor-pane";
import { SearchDialog } from "@/components/search/search-dialog";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { ConfirmDialog } from "@/components/shell/confirm-dialog";
import { StatusBar } from "@/components/shell/status-bar";
import { ToastRegion } from "@/components/shell/toast-region";
import { Sidebar } from "@/components/sidebar/sidebar";
import { useApplySettings } from "@/hooks/use-apply-settings";
import { useGlobalKeys } from "@/hooks/use-global-keys";
import { APP_COMMANDS } from "@/lib/commands/app-commands";
import { registerCommands } from "@/lib/commands/registry";
import { useAppStore } from "@/lib/store/app-store";
import { startApp } from "@/lib/store/note-actions";
import { THEME_COMMANDS } from "@/lib/themes/theme-commands";
import { TRANSFER_COMMANDS } from "@/lib/transfer/transfer-commands";

export function App() {
  const sidebarVisible = useAppStore((state) => state.settings.sidebarVisible);

  useGlobalKeys();
  useApplySettings();
  useEffect(() => registerCommands([...APP_COMMANDS, ...THEME_COMMANDS, ...TRANSFER_COMMANDS]), []);
  useEffect(() => {
    void startApp();
  }, []);

  return (
    <div className="flex h-full flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-raised focus:p-2"
      >
        Skip to the editor
      </a>
      <h1 className="sr-only">Keyslate</h1>
      <div className="flex min-h-0 flex-1">
        {sidebarVisible ? <Sidebar /> : null}
        <main id="main" className="flex min-w-0 flex-1 flex-col bg-bg">
          <EditorPane />
        </main>
      </div>
      <StatusBar />
      <CommandPalette />
      <QuickOpen />
      <SearchDialog />
      <SettingsDialog />
      <ShortcutSheet />
      <ConfirmDialog />
      <ToastRegion />
    </div>
  );
}
