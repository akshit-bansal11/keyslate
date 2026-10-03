import { X } from "lucide-react";
import type { KeyboardEvent, RefObject } from "react";
import { cn } from "@/lib/cn";
import { setNoteTags } from "@/lib/store/note-actions";

interface TagsEditorProps {
  id: string;
  /** As stored: the backend lowercases, trims, dedupes and sorts. */
  tags: readonly string[];
  inputRef: RefObject<HTMLInputElement | null>;
  /** Called when the user is finished here and wants the note back. */
  onDone: () => void;
  className?: string;
}

/** The open note's tags as removable chips, with a field that adds more. */
export function TagsEditor({ id, tags, inputRef, onDone, className }: TagsEditorProps) {
  const add = (input: HTMLInputElement) => {
    const added = input.value
      .split(",")
      .map((tag) => tag.trim().replace(/^#+/, ""))
      .filter(Boolean);
    input.value = "";
    if (added.length > 0) void setNoteTags(id, [...tags, ...added]);
  };

  const remove = (tag: string) => {
    void setNoteTags(
      id,
      tags.filter((entry) => entry !== tag),
    );
    // The chip's button is about to go; keep focus somewhere useful.
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    const input = event.currentTarget;
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (event.key === "Enter" && input.value.trim() === "") onDone();
      else add(input);
    } else if (event.key === "Backspace" && input.value === "" && tags.length > 0) {
      void setNoteTags(id, tags.slice(0, -1));
    } else if (event.key === "Escape") {
      input.value = "";
      onDone();
    }
  };

  return (
    <ul aria-label="Tags" className={cn("flex flex-wrap items-center gap-1", className)}>
      {tags.map((tag) => (
        <li
          key={tag}
          className="flex min-w-0 items-center rounded-control border border-border pl-1.5 text-muted text-xs"
        >
          <span className="max-w-40 truncate">{tag}</span>
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            title={`Remove tag ${tag}`}
            className="ks-hit grid shrink-0 place-items-center rounded-control hover:bg-hover"
            onClick={() => remove(tag)}
          >
            <X aria-hidden="true" focusable="false" className="size-3.5" />
          </button>
        </li>
      ))}
      <li>
        <label>
          <span className="sr-only">Add a tag</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Add a tag"
            autoComplete="off"
            spellCheck={false}
            className="ks-hit w-28 rounded-control bg-transparent px-1.5 text-xs placeholder:text-muted"
            onKeyDown={onKeyDown}
            onBlur={(event) => add(event.currentTarget)}
          />
        </label>
      </li>
    </ul>
  );
}
