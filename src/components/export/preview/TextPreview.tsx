import { Button } from "$components/Button";
import type { TextExportResult } from "$ports";
import { renderMarkdownForText, runCmd } from "$ports";
import * as logger from "@tauri-apps/plugin-log";
import { useCallback, useEffect, useRef, useState } from "react";

type TextPreviewState = { status: "idle" } | { status: "loading" } | { status: "error"; message: string } | {
  status: "success";
  result: TextExportResult;
};

type UseTextPreviewArgs = { locationId: number; relPath: string; text: string };

export type TextPreviewPanelProps = { locationId: number; relPath: string; text: string };

export function useTextPreview({ locationId, relPath, text }: UseTextPreviewArgs) {
  const [state, setState] = useState<TextPreviewState>({ status: "idle" });
  const abortControllerRef = useRef<AbortController | null>(null);

  const generatePreview = useCallback(async (signal: AbortSignal) => {
    if (!text) {
      setState({ status: "idle" });
      return;
    }

    setState({ status: "loading" });

    try {
      const result = await new Promise<TextExportResult>((resolve, reject) => {
        void runCmd(renderMarkdownForText(locationId, relPath, text, void 0, resolve, reject));
      });

      if (signal.aborted) {
        return;
      }

      setState({ status: "success", result });
    } catch (error) {
      if (signal.aborted) {
        return;
      }

      const message = error instanceof Error ? error.message : "Failed to generate preview";
      setState({ status: "error", message });
    }
  }, [locationId, relPath, text]);

  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const { signal } = abortControllerRef.current;

    const timeoutId = setTimeout(() => {
      void generatePreview(signal);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      abortControllerRef.current?.abort();
    };
  }, [generatePreview]);

  return state;
}

const PreviewSkeleton = () => (
  <div className="flex flex-col h-full bg-layer-02 rounded-lg overflow-hidden p-4">
    <div className="space-y-3">
      <div className="h-4 bg-layer-03 rounded animate-pulse w-3/4" />
      <div className="space-y-2">
        <div className="h-3 bg-layer-03 rounded animate-pulse w-full" />
        <div className="h-3 bg-layer-03 rounded animate-pulse w-5/6" />
        <div className="h-3 bg-layer-03 rounded animate-pulse w-4/5" />
      </div>
      <div className="h-20 bg-layer-03 rounded animate-pulse" />
      <div className="space-y-2">
        <div className="h-3 bg-layer-03 rounded animate-pulse w-full" />
        <div className="h-3 bg-layer-03 rounded animate-pulse w-3/4" />
      </div>
    </div>
  </div>
);

const PreviewError = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center h-full bg-layer-02 rounded-lg p-4">
    <div className="text-center">
      <p className="text-sm text-support-error mb-2">Failed to generate preview</p>
      <p className="text-xs text-text-secondary">{message}</p>
    </div>
  </div>
);

const PreviewSuccess = ({ result }: { result: TextExportResult }) => {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(result.text);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1200);
    } catch (error) {
      setCopyState("error");
      void logger.warn(`Failed to copy text export preview: ${error instanceof Error ? error.message : String(error)}`);
      setTimeout(() => setCopyState("idle"), 1600);
    }
  }, [result.text]);

  return (
    <div className="flex flex-col h-full bg-layer-02 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-layer-01 border-b border-stroke-subtle">
        <span className="text-xs text-text-secondary">Preview</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">{result.word_count} words</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-6 px-2 text-[0.6875rem]"
            title={copyState === "copied" ? "Copied" : "Copy text preview"}>
            {copyState === "copied" ? "Copied" : copyState === "error" ? "Retry" : "Copy"}
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <pre className="text-sm text-text-primary whitespace-pre-wrap font-mono leading-relaxed">{result.text}</pre>
      </div>
    </div>
  );
};

export function TextPreviewPanel({ locationId, relPath, text }: TextPreviewPanelProps) {
  const previewState = useTextPreview({ locationId, relPath, text });

  if (previewState.status === "idle") {
    return (
      <div className="flex items-center justify-center h-full bg-layer-02 rounded-lg">
        <p className="text-sm text-text-secondary">Enter text to see preview</p>
      </div>
    );
  }

  if (previewState.status === "loading") {
    return <PreviewSkeleton />;
  }

  if (previewState.status === "error") {
    return <PreviewError message={previewState.message} />;
  }

  return <PreviewSuccess result={previewState.result} />;
}
