import { getBackend } from "@/lib/backend/get-backend";
import { errorMessage } from "@/lib/error-message";
import { parseSettings, type Settings } from "@/lib/settings/settings-schema";
import { type ListView, type Overlay, type Toast, useAppStore } from "@/lib/store/app-store";

const TOAST_MS = 4000;
const SETTINGS_SAVE_MS = 300;

let toastCount = 0;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let settingsTimer: ReturnType<typeof setTimeout> | undefined;

/** Errors stay until dismissed or replaced; a missed error message is a lost one. */
export function notify(message: string, tone: Toast["tone"] = "info") {
  clearTimeout(toastTimer);
  toastCount += 1;
  useAppStore.setState({ toast: { id: toastCount, message, tone } });
  if (tone === "info") toastTimer = setTimeout(dismissToast, TOAST_MS);
}

export function dismissToast() {
  clearTimeout(toastTimer);
  useAppStore.setState({ toast: null });
}

export function reportError(error: unknown) {
  console.error(error);
  notify(errorMessage(error), "error");
}

export function openOverlay(overlay: Overlay) {
  useAppStore.setState({ overlay });
}

export function closeOverlay() {
  useAppStore.setState({ overlay: null });
}

/** Resolves true only when the user confirms. Rendered by `ConfirmDialog`. */
export function askConfirm(message: string, confirmLabel: string): Promise<boolean> {
  return new Promise((resolve) => {
    useAppStore.setState({ confirm: { message, confirmLabel, resolve } });
  });
}

export function answerConfirm(confirmed: boolean) {
  const request = useAppStore.getState().confirm;
  useAppStore.setState({ confirm: null });
  request?.resolve(confirmed);
}

/** Ask the editor to jump to a line. The editor clears it with `null` once done. */
export function setPendingLine(pendingLine: number | null) {
  useAppStore.setState({ pendingLine });
}

export function setView(view: ListView) {
  useAppStore.setState({ view });
}

export function setTagFilter(tagFilter: string | null) {
  useAppStore.setState({ tagFilter });
}

export function setFilterText(filterText: string) {
  useAppStore.setState({ filterText });
}

/** Applies at once, validates, and writes settings.json shortly after. */
export function updateSettings(patch: Partial<Settings>) {
  const settings = parseSettings({ ...useAppStore.getState().settings, ...patch });
  useAppStore.setState({ settings });
  clearTimeout(settingsTimer);
  settingsTimer = setTimeout(() => {
    getBackend().saveSettings(useAppStore.getState().settings).catch(reportError);
  }, SETTINGS_SAVE_MS);
  if ("globalShortcut" in patch) {
    getBackend().setGlobalShortcut(settings.globalShortcut).catch(reportError);
  }
}
