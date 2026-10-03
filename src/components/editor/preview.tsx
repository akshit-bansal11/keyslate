import { type RefObject, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { markdownToFragment } from "@/lib/markdown/render-markdown";
import { useAppStore } from "@/lib/store/app-store";
import { notify, reportError } from "@/lib/store/ui-actions";

const RENDER_DELAY_MS = 120;

interface PreviewProps {
  /** The scrolling region, so a command can move focus to it. */
  ref: RefObject<HTMLDivElement | null>;
  className?: string;
}

/**
 * The rendered note. It follows the store on its own subscription and writes
 * sanitised nodes straight into the page, so typing in split view costs one
 * debounced render and no React work.
 */
export function Preview({ ref, className }: PreviewProps) {
  const proseRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const prose = proseRef.current;
    if (!prose) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const render = () => {
      const { content } = useAppStore.getState();
      if (content.trim() === "") {
        const empty = document.createElement("p");
        empty.className = "ks-prose-empty";
        empty.textContent = "This note is empty. What you write will show here.";
        prose.replaceChildren(empty);
      } else {
        prose.replaceChildren(markdownToFragment(content));
      }
    };

    // The app has no network and no way to open a browser, so a link is copied instead of followed.
    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a") : null;
      if (!link) return;
      event.preventDefault();
      const url = link.getAttribute("href");
      if (!url) return;
      navigator.clipboard
        .writeText(url)
        .then(() => notify("Link copied. Keyslate works offline and does not open links."))
        .catch(reportError);
    };

    render();
    prose.addEventListener("click", onClick);
    prose.addEventListener("auxclick", onClick);
    const unsubscribe = useAppStore.subscribe((state, previous) => {
      if (state.content === previous.content) return;
      clearTimeout(timer);
      if (state.activeId === previous.activeId) timer = setTimeout(render, RENDER_DELAY_MS);
      else render();
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
      prose.removeEventListener("click", onClick);
      prose.removeEventListener("auxclick", onClick);
    };
  }, []);

  return (
    <section ref={ref} aria-label="Preview" tabIndex={-1} className={cn("ks-preview", className)}>
      <article ref={proseRef} className="ks-prose selectable" />
    </section>
  );
}
