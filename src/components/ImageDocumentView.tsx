import { resolveAssetUrl } from "$utils/assets";
import * as logger from "@tauri-apps/plugin-log";
import { useEffect, useMemo, useRef, useState } from "react";

type ImageDocumentViewProps = { locationId?: number; relPath?: string; className?: string };

function fileNameFromPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts.at(-1) ?? path;
}

export function ImageDocumentView({ locationId, relPath, className = "" }: ImageDocumentViewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resolveAttemptRef = useRef(0);

  const fileName = useMemo(() => (relPath ? fileNameFromPath(relPath) : "image"), [relPath]);

  useEffect(() => {
    let isCancelled = false;
    resolveAttemptRef.current += 1;
    const attempt = resolveAttemptRef.current;

    if (locationId === undefined || !relPath) {
      void logger.debug(`ImageDocumentView resolve skipped (attempt=${attempt}): missing locationId or relPath`);
      setImageUrl(null);
      setError("No image selected.");
      return;
    }

    setError(null);
    const assetPath = fileNameFromPath(relPath);
    void logger.debug(
      `ImageDocumentView resolve start (attempt=${attempt}): locationId=${locationId}, relPath=${relPath}, assetPath=${assetPath}`,
    );

    void resolveAssetUrl(locationId, relPath, assetPath).then((resolvedUrl) => {
      if (!isCancelled) {
        void logger.debug(`ImageDocumentView resolve success (attempt=${attempt}): relPath=${relPath}`);
        setImageUrl(resolvedUrl);
      }
    }).catch((err) => {
      if (!isCancelled) {
        setImageUrl(null);
        setError("Failed to load image preview.");
      }
      void logger.error(
        `ImageDocumentView resolve failure (attempt=${attempt}): ${err instanceof Error ? err.message : String(err)}`,
      );
    });

    return () => {
      isCancelled = true;
      void logger.debug(`ImageDocumentView resolve cleanup (attempt=${attempt})`);
    };
  }, [locationId, relPath]);

  if (error) {
    return (
      <div className={`flex min-h-0 min-w-0 flex-1 items-center justify-center bg-surface-lowest ${className}`}>
        <div className="rounded border border-stroke-subtle bg-layer-01 px-4 py-3 text-sm text-text-secondary">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-auto bg-surface-lowest p-8 ${className}`}>
      {imageUrl
        ? <img src={imageUrl} alt={fileName} className="max-h-full max-w-full object-contain shadow-lg" />
        : <div className="text-sm text-text-secondary">Loading image...</div>}
    </div>
  );
}
