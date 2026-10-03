import { runCommand } from "@/lib/commands/registry";
import { reportError } from "@/lib/store/ui-actions";

/** Runs a command by id and surfaces a failure as a toast. Use this from UI. */
export function executeCommand(id: string) {
  runCommand(id).catch(reportError);
}
