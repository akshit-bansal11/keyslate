import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { mountEditor } from "@/lib/editor/editor-instance";

interface CodeEditorProps {
  /** Kept mounted while hidden, so undo history survives a trip through the preview. */
  hidden?: boolean;
  className?: string;
}

/**
 * The CodeMirror surface. It renders once: the editor talks to the store
 * directly (see `editor-instance.ts`), so typing never re-renders React.
 */
export function CodeEditor({ hidden = false, className }: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    return host ? mountEditor(host) : undefined;
  }, []);

  return <div ref={hostRef} hidden={hidden} className={cn("ks-editor", className)} />;
}
