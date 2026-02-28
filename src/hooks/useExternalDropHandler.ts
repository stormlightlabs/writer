import { useWorkspaceController } from "$hooks/controllers/useWorkspaceController";
import { showSuccessToast, showWarnToast } from "$state/stores/toasts";
import type { DocMeta } from "$types";
import { f } from "$utils/serialize";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { DragDropEvent } from "@tauri-apps/api/window";
import { readTextFile } from "@tauri-apps/plugin-fs";
import * as logger from "@tauri-apps/plugin-log";
import { useEffect, useRef } from "react";

type DropTargetInfo = { locationId: number; folderPath?: string };

function resolveDropTarget(x: number, y: number): DropTargetInfo | null {
  const element = document.elementFromPoint(x, y);
  if (!element) return null;

  let current: Element | null = element;
  while (current) {
    const folderPath = (current as HTMLElement).dataset.folderPath;
    const locationId = (current as HTMLElement).dataset.locationId;
    if (folderPath && locationId) {
      const parsed = parseInt(locationId, 10);
      if (!isNaN(parsed)) return { locationId: parsed, folderPath };
    }
    if (locationId) {
      const parsed = parseInt(locationId, 10);
      if (!isNaN(parsed)) return { locationId: parsed };
    }
    current = current.parentElement;
  }

  return null;
}

export function useExternalDropHandler(
  selectedLocationId: number | undefined,
  documents: DocMeta[],
  setExternalDropTarget: (locationId?: number) => void,
  refreshSidebar: (locationId?: number) => void,
) {
  const { handleImportExternalFile } = useWorkspaceController();
  const dropTargetRef = useRef<DropTargetInfo | null>(null);

  useEffect(() => {
    const window = getCurrentWindow();

    const unlisten = window.onDragDropEvent(async (event) => {
      const dragEvent = event.payload as DragDropEvent;

      if (dragEvent.type === "over") {
        const target = resolveDropTarget(dragEvent.position.x, dragEvent.position.y);
        const targetId = target?.locationId ?? selectedLocationId ?? null;
        const targetKey = target ? `${target.locationId}:${target.folderPath ?? ""}` : null;
        const currentKey = dropTargetRef.current
          ? `${dropTargetRef.current.locationId}:${dropTargetRef.current.folderPath ?? ""}`
          : null;

        if (targetKey !== currentKey) {
          dropTargetRef.current = target ?? (targetId ? { locationId: targetId } : null);
          setExternalDropTarget(targetId ?? undefined);
        }
      } else if (dragEvent.type === "drop") {
        const target = dropTargetRef.current;
        const targetId = target?.locationId ?? selectedLocationId;

        dropTargetRef.current = null;
        setExternalDropTarget(undefined);

        if (!targetId) {
          logger.info("External file drop ignored: no target location");
          return;
        }

        const files = dragEvent.paths.filter((path) => path.toLowerCase().endsWith(".md"));

        if (files.length === 0) {
          logger.info("External file drop ignored: no markdown files");
          showWarnToast("Only .md files can be imported");
          return;
        }

        logger.info(
          f("Importing external files", { count: files.length, locationId: targetId, folderPath: target?.folderPath }),
        );

        const existingPaths = new Set(
          documents.filter((d) => d.location_id === targetId).map((d) => d.rel_path.toLowerCase()),
        );

        let successCount = 0;
        let skipCount = 0;

        for (const filePath of files) {
          const filename = filePath.split(/[\\/]/).pop() ?? "imported.md";
          const relPath = target?.folderPath ? `${target.folderPath}/${filename}` : filename;

          if (existingPaths.has(relPath.toLowerCase())) {
            logger.warn(f("Skipping file that already exists", { filePath, relPath }));
            skipCount++;
            continue;
          }

          try {
            const content = await readTextFile(filePath);
            const success = await handleImportExternalFile(targetId, relPath, content);
            if (success) successCount++;
          } catch (error) {
            logger.error(f("Failed to import file", { filePath, error }));
          }
        }

        if (successCount > 0) {
          refreshSidebar(targetId);
          showSuccessToast(`Imported ${successCount} file${successCount === 1 ? "" : "s"}`);
        }

        if (skipCount > 0) {
          showWarnToast(`Skipped ${skipCount} file${skipCount === 1 ? "" : "s"} (already exists)`);
        }

        logger.info(
          f("External file import complete", { success: successCount, skipped: skipCount, total: files.length }),
        );
      } else {
        dropTargetRef.current = null;
        setExternalDropTarget(undefined);
      }
    });

    return () => {
      unlisten.then((fn) => fn()).catch((error) => {
        logger.error(f("Failed to unlisten from drag-drop events", { error }));
      });
    };
  }, [selectedLocationId, documents, setExternalDropTarget, refreshSidebar, handleImportExternalFile]);
}
