import "@/styles/editor.css";
import { useEffect, useRef } from "react";
import { CodeEditor } from "@/components/editor/code-editor";
import { NoteHeader } from "@/components/editor/note-header";
import { Preview } from "@/components/editor/preview";
import { CommandHint } from "@/components/ui/command-hint";
import { executeCommand } from "@/lib/commands/execute";
import { registerCommands } from "@/lib/commands/registry";
import { activeFormat } from "@/lib/editor/active-note";
import { createEditorCommands } from "@/lib/editor/editor-commands";
import { useAppStore } from "@/lib/store/app-store";

const focusEditor = () => executeCommand("editor.focus");

/** The open note: its header, and the editor, the preview or both, as the view mode says. */
export function EditorPane() {
  const ready = useAppStore((state) => state.ready);
  const activeId = useAppStore((state) => state.activeId);
  const format = useAppStore(activeFormat);
  const viewMode = useAppStore((state) => state.settings.viewMode);
  const titleRef = useRef<HTMLInputElement>(null);
  const tagsRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      registerCommands(
        createEditorCommands({
          title: () => titleRef.current,
          tags: () => tagsRef.current,
          preview: () => previewRef.current,
        }),
      ),
    [],
  );

  if (activeId === null) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center overflow-auto p-6">
        {ready ? (
          <div className="flex max-w-sm flex-col items-center gap-3 text-center">
            <p className="text-lg">No note is open</p>
            <p className="text-muted">Start a new note, or go to one you already have.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <CommandHint commandId="note.new" label="New note" />
              <CommandHint commandId="quickOpen.open" label="Go to note" />
            </div>
          </div>
        ) : (
          <p role="status" className="text-muted">
            Loading your notes
          </p>
        )}
      </div>
    );
  }

  // Plain text has nothing to render, so it is always shown in the editor.
  const showEditor = format === "txt" || viewMode !== "preview";
  const showPreview = format === "md" && viewMode !== "edit";

  return (
    <>
      <NoteHeader
        id={activeId}
        format={format}
        titleRef={titleRef}
        tagsRef={tagsRef}
        onDone={focusEditor}
      />
      <div className="ks-editor-body">
        <div className="ks-editor-split">
          <CodeEditor hidden={!showEditor} />
          {showPreview ? <Preview ref={previewRef} /> : null}
        </div>
      </div>
    </>
  );
}
