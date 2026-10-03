import { Command } from "cmdk";
import { useState } from "react";
import { CommandRow } from "@/components/command/command-row";
import { Picker } from "@/components/command/picker";
import { Modal } from "@/components/ui/modal";
import { useCommands } from "@/hooks/use-commands";
import { groupCommands } from "@/lib/command-ui/command-groups";
import { fuzzyRank } from "@/lib/command-ui/fuzzy";
import { closeIfCurrent } from "@/lib/command-ui/picker-actions";
import { recentCommandIds } from "@/lib/command-ui/recent-commands";
import { useAppStore } from "@/lib/store/app-store";

const RECENT_PREFIX = "recent:";

function PaletteBody() {
  const [query, setQuery] = useState("");
  const commands = useCommands();
  const filtering = query.trim() !== "";
  const matches = fuzzyRank(commands, query, (command) => [command.title, command.group]);
  const recent = recentCommandIds().flatMap(
    (id) => commands.find((command) => command.id === id) ?? [],
  );

  return (
    <Picker
      label="Commands"
      placeholder="Run a command"
      query={query}
      onQueryChange={setQuery}
      empty={`No command matches "${query.trim()}". Try fewer letters.`}
      status={`${matches.length} ${matches.length === 1 ? "command" : "commands"}`}
    >
      {filtering ? (
        // Ranked best first; grouping would bury the best match under its group.
        matches.map((command) => (
          <CommandRow
            key={command.id}
            command={command}
            value={command.id}
            detail={command.group}
          />
        ))
      ) : (
        <>
          {recent.length > 0 ? (
            <Command.Group heading="Recent">
              {recent.map((command) => (
                <CommandRow
                  key={command.id}
                  command={command}
                  value={`${RECENT_PREFIX}${command.id}`}
                  detail={command.group}
                />
              ))}
            </Command.Group>
          ) : null}
          {groupCommands(commands).map((entry) => (
            <Command.Group key={entry.group} heading={entry.group}>
              {entry.commands.map((command) => (
                <CommandRow key={command.id} command={command} value={command.id} />
              ))}
            </Command.Group>
          ))}
        </>
      )}
    </Picker>
  );
}

/** Every command, fuzzy-filtered. Enter runs the selected one. */
export function CommandPalette() {
  const open = useAppStore((state) => state.overlay === "palette");

  return (
    <Modal
      open={open}
      onClose={() => closeIfCurrent("palette")}
      label="Command palette"
      placement="top"
    >
      <PaletteBody />
    </Modal>
  );
}
