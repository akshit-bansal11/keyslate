import { useEffect } from "react";
import { firesWhileTyping, keyFromEvent } from "@/lib/commands/keys";
import { commandForKey } from "@/lib/commands/registry";
import { useAppStore } from "@/lib/store/app-store";
import { reportError } from "@/lib/store/ui-actions";

/** Set on an element (or an ancestor) that wants raw key presses, e.g. while recording a shortcut. */
export const KEY_CAPTURE_ATTRIBUTE = "data-key-capture";

function isTextField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.matches("input, textarea, select"))
  );
}

/**
 * Resolves key presses to commands. It listens in the capture phase so an app
 * shortcut wins over the editor's own keymap for the same combo.
 */
export function useGlobalKeys() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (event.target instanceof Element && event.target.closest(`[${KEY_CAPTURE_ATTRIBUTE}]`)) {
        return;
      }
      // A modal owns the keyboard while it is open; Escape closes it natively.
      const { overlay, confirm } = useAppStore.getState();
      if (overlay !== null || confirm !== null) return;
      const key = keyFromEvent(event);
      if (key === null) return;
      if (!firesWhileTyping(key) && isTextField(event.target)) return;
      const command = commandForKey(key, useAppStore.getState().settings.keybindings);
      if (!command) return;
      event.preventDefault();
      event.stopPropagation();
      Promise.resolve(command.run()).catch(reportError);
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, []);
}
