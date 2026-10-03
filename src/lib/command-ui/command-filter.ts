import { type Command, keyFor } from "@/lib/commands/registry";

/** Plain substring match, for lists that keep their own order while filtered. */
export function matchesFilter(texts: readonly string[], filter: string): boolean {
  const needle = filter.trim().toLowerCase();
  return needle === "" || texts.some((text) => text.toLowerCase().includes(needle));
}

/** Commands whose title, group or current key contains the filter text. */
export function filterCommands(
  commands: readonly Command[],
  overrides: Readonly<Record<string, string>>,
  filter: string,
): Command[] {
  return commands.filter((command) =>
    matchesFilter([command.title, command.group, keyFor(command, overrides) ?? ""], filter),
  );
}
