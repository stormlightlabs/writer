import { markdownHelpGet, renderMarkdown, runCmd } from "$ports";
import { cn } from "$utils/tw";
import { useEffect, useMemo, useState } from "react";

type MarkdownHelpContentProps = { className?: string };

let markdownHelpHtmlCache: string | null = null;
let markdownHelpHtmlInFlight: Promise<string> | null = null;

function toErrorMessage(error: unknown): string {
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Unable to load help content";
}

function loadMarkdownHelpHtml(): Promise<string> {
  if (markdownHelpHtmlCache !== null) {
    return Promise.resolve(markdownHelpHtmlCache);
  }

  if (markdownHelpHtmlInFlight) {
    return markdownHelpHtmlInFlight;
  }

  markdownHelpHtmlInFlight = new Promise<string>((resolve, reject) => {
    void runCmd(markdownHelpGet((markdown) => {
      void runCmd(renderMarkdown(0, "help.md", markdown, undefined, (result) => {
        resolve(result.html);
      }, reject));
    }, reject));
  }).then((html) => {
    markdownHelpHtmlCache = html;
    return html;
  }).finally(() => {
    markdownHelpHtmlInFlight = null;
  });

  return markdownHelpHtmlInFlight;
}

export function MarkdownHelpContent({ className }: MarkdownHelpContentProps) {
  const [html, setHtml] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const innerHtml = useMemo(() => {
    return { __html: html };
  }, [html]);

  useEffect(() => {
    let cancelled = false;

    void loadMarkdownHelpHtml().then((nextHtml) => {
      if (!cancelled) {
        setHtml(nextHtml);
        setLoading(false);
      }
    }).catch((err) => {
      if (!cancelled) {
        setError(toErrorMessage(err));
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className={cn("p-4 text-text-secondary", className)} aria-live="polite">
        <p>Loading markdown help...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-4 text-text-secondary", className)} aria-live="polite">
        <p>Failed to load markdown help: {error}</p>
      </div>
    );
  }

  return (
    <div className={cn("p-4", className)}>
      <div
        className="preview-content prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={innerHtml} />
    </div>
  );
}
