import type { AppTheme, EditorFontFamily, MarkdownPreviewStyle, RenderResult } from "$types";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";

export type PreviewProps = {
  renderResult: RenderResult | null;
  theme: AppTheme;
  editorLine: number;
  previewStyle: MarkdownPreviewStyle;
  editorFontFamily: EditorFontFamily;
  onScrollToLine?: (line: number) => void;
  className?: string;
};

const PDF_PREVIEW_FONT_MAP: Record<EditorFontFamily, string> = {
  "IBM Plex Mono": "\"Writer IBM Plex Mono\", \"IBM Plex Mono\", \"SF Mono\", Monaco, \"Cascadia Code\", monospace",
  "IBM Plex Sans Variable":
    "\"Writer IBM Plex Sans\", \"IBM Plex Sans\", -apple-system, BlinkMacSystemFont, sans-serif",
  "IBM Plex Serif": "\"Writer IBM Plex Serif\", \"IBM Plex Serif\", Georgia, \"Times New Roman\", serif",
  "Monaspace Argon": "\"Writer Monaspace Argon\", \"Writer IBM Plex Mono\", monospace",
  "Monaspace Krypton": "\"Writer Monaspace Krypton\", \"Writer IBM Plex Mono\", monospace",
  "Monaspace Neon": "\"Writer Monaspace Neon\", \"Writer IBM Plex Mono\", monospace",
  "Monaspace Radon": "\"Writer Monaspace Radon\", \"Writer IBM Plex Mono\", monospace",
  "Monaspace Xenon": "\"Writer Monaspace Xenon\", \"Writer IBM Plex Mono\", monospace",
};

export function Preview(
  { renderResult, theme, editorLine, previewStyle, editorFontFamily, onScrollToLine, className = "" }: PreviewProps,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const previewContent = useMemo(() => ({ __html: renderResult?.html ?? "" }), [renderResult]);

  const findElementForLine = useCallback((line: number): HTMLElement | null => {
    const container = containerRef.current;
    if (!container) return null;

    const elements = container.querySelectorAll("[data-sourcepos]");

    for (const el of elements) {
      const sourcepos = (el as HTMLElement).dataset.sourcepos;
      if (!sourcepos) continue;

      const match = sourcepos.match(/^(\d+):/);
      if (match) {
        const startLine = parseInt(match[1], 10);
        const endMatch = sourcepos.match(/-(\d+):/);
        const endLine = endMatch ? parseInt(endMatch[1], 10) : startLine;

        if (line >= startLine && line <= endLine) {
          return el as HTMLElement;
        }
      }
    }

    return null;
  }, []);

  useEffect(() => {
    if (!containerRef.current || isScrollingRef.current) return;

    const element = findElementForLine(editorLine);
    if (element) {
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      const relativeTop = elementRect.top - containerRect.top + container.scrollTop;
      const targetScroll = relativeTop - container.clientHeight * 0.3;

      container.scrollTo({ top: Math.max(0, targetScroll), behavior: "smooth" });
    }
  }, [editorLine, findElementForLine]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || !onScrollToLine) return;

    isScrollingRef.current = true;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      const elements = container.querySelectorAll("[data-sourcepos]");
      const containerRect = container.getBoundingClientRect();
      const containerTop = containerRect.top + container.clientHeight * 0.3;

      let closestElement: Element | null = null;
      let closestDistance = Infinity;

      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        const distance = Math.abs(rect.top - containerTop);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestElement = el;
        }
      }

      if (closestElement) {
        const sourcepos = (closestElement as HTMLElement).dataset.sourcepos;
        if (sourcepos) {
          const match = sourcepos.match(/^(\d+):/);
          if (match) {
            onScrollToLine(parseInt(match[1], 10));
          }
        }
      }

      isScrollingRef.current = false;
    }, 150);
  }, [onScrollToLine]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const previewContentClassName = useMemo(() => `preview-content preview-content--${previewStyle}`, [previewStyle]);
  const previewContentStyle = useMemo<CSSProperties | undefined>(
    () =>
      previewStyle === "pdf"
        ? { ["--preview-pdf-font-family" as string]: PDF_PREVIEW_FONT_MAP[editorFontFamily] }
        : undefined,
    [previewStyle, editorFontFamily],
  );

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      data-theme={theme}
      className={`flex-1 overflow-auto p-6 bg-surface-primary text-text-primary ${className}`}>
      <div className={previewContentClassName} style={previewContentStyle} dangerouslySetInnerHTML={previewContent} />
    </div>
  );
}
