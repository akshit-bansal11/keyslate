import { Command } from "cmdk";
import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import "@/styles/command.css";

interface PickerProps {
  /** Accessible name of the input and the list. */
  label: string;
  placeholder: string;
  query: string;
  onQueryChange: (query: string) => void;
  /** Shown in place of the list while it has no rows. */
  empty: ReactNode;
  /** One line under the list, announced politely when it changes. */
  status: string;
  className?: string;
  /** `Command.Item` rows, optionally inside `Command.Group`, already filtered and ordered. */
  children: ReactNode;
}

/**
 * The input-over-list body shared by the palette, quick-open and search, so the
 * three look and behave the same. cmdk supplies the combobox semantics and the
 * arrow, Home, End and Enter handling; callers do their own filtering.
 */
export function Picker({
  label,
  placeholder,
  query,
  onQueryChange,
  empty,
  status,
  className,
  children,
}: PickerProps) {
  return (
    <Command
      label={label}
      shouldFilter={false}
      loop
      vimBindings={false}
      className={cn("flex min-h-0 flex-col", className)}
    >
      <div className="flex shrink-0 items-center gap-2 border-border border-b px-3">
        <Search className="size-4 shrink-0 text-muted" aria-hidden="true" focusable="false" />
        <Command.Input
          autoFocus
          value={query}
          onValueChange={onQueryChange}
          placeholder={placeholder}
        />
      </div>
      <Command.List label={label}>
        <Command.Empty>{empty}</Command.Empty>
        {children}
      </Command.List>
      <p
        role="status"
        className="min-h-6 shrink-0 border-border border-t px-3 py-1 text-muted text-xs"
      >
        {status}
      </p>
    </Command>
  );
}
