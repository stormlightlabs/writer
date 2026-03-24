import { useImageController } from "$hooks/useImageController";
import { f } from "$utils/serialize";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import * as logger from "@tauri-apps/plugin-log";
import { useCallback, useEffect, useRef, useState } from "react";

const SUPPORTED_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
const IMAGE_IMPORT_DIR = "images";

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export type EditorInsertAction = { text: string; requestId: number };

function normalizePathSegments(path: string): string[] {
  return path.split("/").filter((segment) => segment !== "" && segment !== ".");
}

function toDocRelativeAssetPath(docRelPath: string | null, assetPath: string): string {
  if (!docRelPath || !assetPath) {
    return assetPath;
  }

  const docSegments = normalizePathSegments(docRelPath);
  docSegments.pop();
  const assetSegments = normalizePathSegments(assetPath);

  let sharedPrefix = 0;
  while (
    sharedPrefix < docSegments.length
    && sharedPrefix < assetSegments.length
    && docSegments[sharedPrefix] === assetSegments[sharedPrefix]
  ) {
    sharedPrefix += 1;
  }

  const upSegments = new Array(docSegments.length - sharedPrefix).fill("..");
  const downSegments = assetSegments.slice(sharedPrefix);
  const relative = [...upSegments, ...downSegments].join("/");
  return relative || assetPath;
}

function imageMarkdown(docRelPath: string | null, assetPath: string): string {
  return `![image](${toDocRelativeAssetPath(docRelPath, assetPath)})`;
}

function isImagePath(filePath: string): boolean {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return SUPPORTED_EXTENSIONS.includes(ext);
}

/**
 * Handles image import flows for the editor:
 * - Clipboard paste (File → temp file → image_import → insert)
 * - File picker (dialog → image_import → insert)
 * - Drag-and-drop onto the editor area (native path → image_import → insert)
 */
export function useEditorImageHandlers(
  locationId: number | null,
  docRelPath: string | null,
): {
  insertAt: EditorInsertAction | null;
  handleImageFilePaste: (file: File) => void;
  handlePickAndInsertImage: () => Promise<void>;
} {
  const { importImage } = useImageController();
  const [insertAt, setInsertAt] = useState<EditorInsertAction | null>(null);
  const requestIdRef = useRef(0);

  const triggerInsert = useCallback((assetPath: string) => {
    requestIdRef.current += 1;
    setInsertAt({ text: imageMarkdown(docRelPath, assetPath), requestId: requestIdRef.current });
  }, [docRelPath]);

  const handleImageFilePaste = useCallback((file: File) => {
    if (!locationId) {
      return;
    }

    const ext = MIME_TO_EXT[file.type];
    if (!ext) {
      void logger.warn(f("Unsupported image MIME type for paste", { type: file.type }));
      return;
    }

    void (async () => {
      try {
        const tempPath = `/tmp/writer-paste-${Date.now()}.${ext}`;
        const bytes = new Uint8Array(await file.arrayBuffer());
        await writeFile(tempPath, bytes);
        const assetPath = await importImage(locationId, tempPath, IMAGE_IMPORT_DIR);
        if (assetPath) {
          triggerInsert(assetPath);
        }
      } catch (err) {
        void logger.error(f("Image paste failed", { error: String(err) }));
      }
    })();
  }, [locationId, importImage, triggerInsert]);

  const handlePickAndInsertImage = useCallback(async () => {
    if (!locationId) {
      return;
    }

    try {
      const selected = await open({ multiple: false, filters: [{ name: "Images", extensions: SUPPORTED_EXTENSIONS }] });

      if (!selected || typeof selected !== "string") {
        return;
      }

      const assetPath = await importImage(locationId, selected, IMAGE_IMPORT_DIR);
      if (assetPath) {
        triggerInsert(assetPath);
      }
    } catch (err) {
      void logger.error(f("Image pick failed", { error: String(err) }));
    }
  }, [locationId, importImage, triggerInsert]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    void getCurrentWindow().onDragDropEvent(async (event) => {
      if (event.payload.type !== "drop") {
        return;
      }

      const { position, paths } = event.payload as { position: { x: number; y: number }; paths: string[] };

      const el = document.elementFromPoint(position.x, position.y);
      if (!el?.closest("[data-testid=\"editor-container\"]")) {
        return;
      }

      const imagePaths = paths.filter(p => isImagePath(p));
      if (imagePaths.length === 0 || !locationId) {
        return;
      }

      const assetPath = await importImage(locationId, imagePaths[0], IMAGE_IMPORT_DIR);
      if (assetPath) {
        triggerInsert(assetPath);
      }
    }).then((fn) => {
      unlisten = fn;
    }).catch((err) => {
      void logger.error(f("Editor image drop listener failed", { error: String(err) }));
    });

    return () => {
      unlisten?.();
    };
  }, [locationId, importImage, triggerInsert]);

  return { insertAt, handleImageFilePaste, handlePickAndInsertImage };
}
