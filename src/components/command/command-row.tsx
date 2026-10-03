import { Command } from "cmdk";
import { runCommandFromPicker } from "@/lib/command-ui/picker-actions";
import { type Command as AppCommand, keyFor } from "@/lib/commands/registry";
import { useAppStore } from "@/lib/store/app-store";

interface CommandRowProps {
  command: AppCommand;
  /** Unique within the list; a command can appear twice (recent and in its group). */
  value: string;
  /** Muted text before the key, e.g. the group when the list is not grouped. */
  detail?: string;
}

/** One palette row: title on the left, the live key on the right. */
export function CommandRow({ command, value, detail }: CommandRowProps) {
  const key = useAppStore((state) => keyFor(command, state.settings.keybindings));

  return (
    <Command.Item value={value} onSelect={() => runCommandFromPicker(command.id)}>
      <span className="min-w-0 flex-1 truncate">{command.title}</span>
      {detail ? <span className="shrink-0 text-muted text-xs">{detail}</span> : null}
      {key ? <kbd className="ks-kbd shrink-0">{key}</kbd> : null}
    </Command.Item>
  );
}
