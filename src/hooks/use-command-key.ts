import { useCommands } from "@/hooks/use-commands";
import { keyFor } from "@/lib/commands/registry";
import { useAppStore } from "@/lib/store/app-store";

/** The key currently bound to a command, or undefined when it has none. */
export function useCommandKey(commandId: string): string | undefined {
  const commands = useCommands();
  const keybindings = useAppStore((state) => state.settings.keybindings);
  const command = commands.find((entry) => entry.id === commandId);
  return command ? keyFor(command, keybindings) : undefined;
}
