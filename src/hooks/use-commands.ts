import { useSyncExternalStore } from "react";
import { type Command, getCommands, subscribeCommands } from "@/lib/commands/registry";

/** Every registered command, re-rendering when the set changes. */
export function useCommands(): readonly Command[] {
  return useSyncExternalStore(subscribeCommands, getCommands);
}
