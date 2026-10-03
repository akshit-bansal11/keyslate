import type { Command, CommandGroup } from "@/lib/commands/registry";

/** The order groups appear in, everywhere commands are listed. */
export const GROUP_ORDER: readonly CommandGroup[] = [
  "Note",
  "Edit",
  "View",
  "Go",
  "Vault",
  "Theme",
  "App",
];

/** Commands bucketed by group in `GROUP_ORDER`, keeping their order inside each. Empty groups are dropped. */
export function groupCommands(
  commands: readonly Command[],
): { group: CommandGroup; commands: Command[] }[] {
  return GROUP_ORDER.map((group) => ({
    group,
    commands: commands.filter((command) => command.group === group),
  })).filter((entry) => entry.commands.length > 0);
}
