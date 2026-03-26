import type { AppTheme, MarkdownPreviewStyle, RenderedFontFamily, RenderResult } from "$types";
import {
  isAtProtoBlobReference,
  isExternalAssetReference,
  isResolvableLocalAssetReference,
  logAssetResolutionFailure,
  resolveAssetPath,
  resolveAssetUrl,
  resolveAtProtoBlobUrl,
} from "$utils/assets";
import { f } from "$utils/serialize";
import * as logger from "@tauri-apps/plugin-log";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEventHandler } from "react";

export type PreviewProps = {
  renderResult: RenderResult | null;
  theme: AppTheme;
  editorLine: number;
  previewStyle: MarkdownPreviewStyle;
  renderedFontFamily: RenderedFontFamily;
  locationId?: number;
  docRelPath?: string;
  blobDid?: string;
  onScrollToLine?: (line: number) => void;
  className?: string;
};

const PDF_PREVIEW_FONT_MAP: Record<RenderedFontFamily, string> = {
  "IBM Plex Mono": "\"Writer IBM Plex Mono\", \"IBM Plex Mono\", \"SF Mono\", Monaco, \"Cascadia Code\", monospace",
  "IBM Plex Sans Variable":
    "\"Writer IBM Plex Sans\", \"IBM Plex Sans\", -apple-system, BlinkMacSystemFont, sans-serif",
  "IBM Plex Serif": "\"Writer IBM Plex Serif\", \"IBM Plex Serif\", Georgia, \"Times New Roman\", serif",
  "Maple Mono": "\"Writer Maple Mono\", \"Maple Mono\", \"SF Mono\", Monaco, monospace",
  "Monaspace Argon": "\"Writer Monaspace Argon\", \"Writer IBM Plex Mono\", monospace",
  "Monaspace Krypton": "\"Writer Monaspace Krypton\", \"Writer IBM Plex Mono\", monospace",
  "Monaspace Neon": "\"Writer Monaspace Neon\", \"Writer IBM Plex Mono\", monospace",
  "Monaspace Radon": "\"Writer Monaspace Radon\", \"Writer IBM Plex Mono\", monospace",
  "Monaspace Xenon": "\"Writer Monaspace Xenon\", \"Writer IBM Plex Mono\", monospace",
  "Noto Sans CJK SC": "\"Writer Noto Sans CJK SC\", \"Noto Sans SC\", \"Noto Sans JP\", \"Noto Sans KR\", sans-serif",
};

export function Preview(
  {
    renderResult,
    theme,
    editorLine,
    previewStyle,
    renderedFontFamily,
    locationId,
    docRelPath,
    blobDid,
    onScrollToLine,
    className = "",
  }: PreviewProps,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [zoomedSrc, setZoomedSrc] = useState<string | null>(null);

  const previewHtml = renderResult?.html ?? "";
  const previewContent = useMemo(() => ({ __html: previewHtml }), [previewHtml]);

  useEffect(() => {
    if (!containerRef.current || locationId === undefined || !docRelPath) return;

    const container = containerRef.current;
    let isCancelled = false;

    const resolvePreviewAssets = async () => {
      const images = [...container.querySelectorAll<HTMLImageElement>("img[src]")];
      const links = [...container.querySelectorAll<HTMLAnchorElement>("a[href]")];
      const startedAt = globalThis.performance?.now?.() ?? Date.now();

      void logger.debug(
        f("Preview asset resolution start", {
          keyValues: {
            locationId,
            docRelPath,
            blobDid: blobDid ?? "",
            imageCount: images.length,
            linkCount: links.length,
          },
        }),
      );

      await Promise.allSettled(images.map(async (img) => {
        const src = img.getAttribute("src");
        if (!src) return;

        if (isAtProtoBlobReference(src)) {
          if (!blobDid) {
            logAssetResolutionFailure("preview blob image", src, "Missing blob DID context");
            return;
          }

          try {
            const resolvedBlobUrl = await resolveAtProtoBlobUrl(locationId, docRelPath, blobDid, src);
            if (!isCancelled) {
              img.src = resolvedBlobUrl;
            }
          } catch (error) {
            logAssetResolutionFailure("preview blob image", src, error);
          }
          return;
        }

        if (!isResolvableLocalAssetReference(src)) {
          return;
        }

        try {
          const resolvedUrl = await resolveAssetUrl(locationId, docRelPath, src);
          if (!isCancelled) {
            img.src = resolvedUrl;
          }
        } catch (error) {
          logAssetResolutionFailure("preview image", src, error);
        }
      }));

      await Promise.allSettled(links.map(async (link) => {
        const href = link.getAttribute("href");
        if (!href || !isResolvableLocalAssetReference(href)) return;

        try {
          const resolvedPath = await resolveAssetPath(locationId, docRelPath, href);
          if (!isCancelled) {
            link.dataset.localAssetPath = resolvedPath;
          }
        } catch (error) {
          logAssetResolutionFailure("preview link", href, error);
        }
      }));

      const finishedAt = globalThis.performance?.now?.() ?? Date.now();
      void logger.debug(
        f("Preview asset resolution complete", {
          keyValues: {
            locationId,
            docRelPath,
            elapsedMs: Math.round(finishedAt - startedAt),
            imageCount: images.length,
            linkCount: links.length,
          },
        }),
      );
    };

    void resolvePreviewAssets();

    return () => {
      isCancelled = true;
    };
  }, [blobDid, docRelPath, locationId, previewHtml]);

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

  const handleContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const link = target.closest("a");
    if (link) {
      const localAssetPath = link.dataset.localAssetPath;
      const href = link.getAttribute("href");

      if (localAssetPath) {
        e.preventDefault();
        void openPath(localAssetPath).catch((error) => {
          void logger.warn(
            `Failed to open local preview asset: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
        return;
      }

      if (href && isExternalAssetReference(href)) {
        e.preventDefault();
        void openUrl(href).catch((error) => {
          void logger.warn(`Failed to open preview link: ${error instanceof Error ? error.message : String(error)}`);
        });
        return;
      }

      if (href && locationId !== undefined && docRelPath && isResolvableLocalAssetReference(href)) {
        e.preventDefault();
        void resolveAssetPath(locationId, docRelPath, href).then((resolvedPath) => openPath(resolvedPath)).catch(
          (error) => {
            logAssetResolutionFailure("preview link", href, error);
          },
        );
        return;
      }
    }

    const image = target.closest("img");
    if (image) {
      setZoomedSrc((image as HTMLImageElement).src);
    }
  }, [docRelPath, locationId]);

  useEffect(() => {
    if (!zoomedSrc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomedSrc(null);
    };

    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [zoomedSrc]);

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
        ? { ["--preview-pdf-font-family" as string]: PDF_PREVIEW_FONT_MAP[renderedFontFamily] }
        : undefined,
    [previewStyle, renderedFontFamily],
  );

  const handleWrapperClick = useCallback(() => {
    if (zoomedSrc) {
      setZoomedSrc(null);
    }
  }, [zoomedSrc]);

  const handleImageClick: MouseEventHandler<HTMLImageElement> = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onClick={handleContentClick}
        data-theme={theme}
        className={`flex-1 overflow-auto p-16 bg-surface-lowest text-text-primary ${className}`}>
        <div className={previewContentClassName} style={previewContentStyle} dangerouslySetInnerHTML={previewContent} />
      </div>
      {zoomedSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-zoom-out"
          onClick={handleWrapperClick}>
          <img
            src={zoomedSrc}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain cursor-default"
            onClick={handleImageClick} />
        </div>
      )}
    </>
  );
}
