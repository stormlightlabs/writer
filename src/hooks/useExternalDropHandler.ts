import { normalizePointerCoordinates, resolveDestinationFromPointer } from "$dnd";
import { extractClosestEdge } from "$dnd";
import { showSuccessToast, showWarnToast } from "$state/stores/toasts";
import type { SidebarActiveDropTarget } from "$state/types";
import type { DocMeta } from "$types";
import { f } from "$utils/serialize";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { DragDropEvent } from "@tauri-apps/api/window";
import { readTextFile } from "@tauri-apps/plugin-fs";
import * as logger from "@tauri-apps/plugin-log";
import type { RefObject } from "react";
import { useCallback, useEffect, useRef } from "react";

type DropTargetInfo = { locationId: number; folderPath?: string; activeDropTarget: SidebarActiveDropTarget };

const EDGE_SCROLL_THRESHOLD_PX = 40;
const EDGE_SCROLL_STEP_PX = 14;

function getParentDirectoryPath(relPath: string): string | undefined {
  const parts = relPath.split("/").filter(Boolean);
  if (parts.length <= 1) {
    return undefined;
  }

  return parts.slice(0, -1).join("/");
}

function resolveDropTarget(viewportX: number, viewportY: number): DropTargetInfo | null {
  const target = resolveDestinationFromPointer(viewportX, viewportY);
  if (!target) {
    return null;
  }

  const destination = target.destination;
  const edge = extractClosestEdge(destination);

  if (destination.folderPath) {
    const folderPath = destination.folderPath;
    return {
      locationId: destination.locationId,
      folderPath,
      activeDropTarget: {
        source: "external",
        locationId: destination.locationId,
        targetType: "folder",
        folderPath,
        intent: "into",
      },
    };
  }

  if (destination.targetType === "document" && destination.relPath) {
    const parentFolderPath = getParentDirectoryPath(destination.relPath);
    return {
      locationId: destination.locationId,
      ...(parentFolderPath ? { folderPath: parentFolderPath } : {}),
      activeDropTarget: {
        source: "external",
        locationId: destination.locationId,
        targetType: "document",
        relPath: destination.relPath,
        ...(parentFolderPath ? { folderPath: parentFolderPath } : {}),
        ...(edge ? { edge } : {}),
        intent: "between",
      },
    };
  }

  return {
    locationId: destination.locationId,
    activeDropTarget: {
      source: "external",
      locationId: destination.locationId,
      targetType: "location",
      intent: "into",
    },
  };
}

export function useExternalDropHandler(
  selectedLocationId: number | undefined,
  documents: DocMeta[],
  setActiveDropTarget: (target: SidebarActiveDropTarget | null) => void,
  refreshSidebar: (locationId?: number) => void,
  handleImportExternalFile: (locationId: number, relPath: string, content: string) => Promise<boolean>,
  dropZoneRef?: RefObject<HTMLDivElement | null>,
) {
  const dropTargetRef = useRef<DropTargetInfo | null>(null);
  const hasExternalFileDragRef = useRef(false);
  const edgeScrollRafRef = useRef<number | null>(null);
  const edgeScrollDirectionRef = useRef<1 | -1 | 0>(0);

  const stopEdgeScroll = useCallback(() => {
    if (edgeScrollRafRef.current !== null) {
      cancelAnimationFrame(edgeScrollRafRef.current);
      edgeScrollRafRef.current = null;
    }
    edgeScrollDirectionRef.current = 0;
  }, []);

  const applyEdgeScrollForY = useCallback((clientY: number | null) => {
    const scrollContainer = dropZoneRef?.current;
    if (!scrollContainer || clientY === null) {
      stopEdgeScroll();
      return;
    }

    const rect = scrollContainer.getBoundingClientRect();
    let nextDirection: 1 | -1 | 0 = 0;
    if (clientY <= rect.top + EDGE_SCROLL_THRESHOLD_PX) {
      nextDirection = -1;
    } else if (clientY >= rect.bottom - EDGE_SCROLL_THRESHOLD_PX) {
      nextDirection = 1;
    }

    if (nextDirection === 0) {
      stopEdgeScroll();
      return;
    }

    edgeScrollDirectionRef.current = nextDirection;
    if (edgeScrollRafRef.current !== null) {
      return;
    }

    const tick = () => {
      const container = dropZoneRef?.current;
      const direction = edgeScrollDirectionRef.current;
      if (!container || direction === 0) {
        edgeScrollRafRef.current = null;
        return;
      }

      const previousTop = container.scrollTop;
      container.scrollTop = Math.max(
        0,
        Math.min(container.scrollHeight - container.clientHeight, previousTop + direction * EDGE_SCROLL_STEP_PX),
      );

      if (container.scrollTop === previousTop) {
        edgeScrollRafRef.current = null;
        return;
      }

      edgeScrollRafRef.current = requestAnimationFrame(tick);
    };

    edgeScrollRafRef.current = requestAnimationFrame(tick);
  }, [dropZoneRef, stopEdgeScroll]);

  useEffect(() => {
    const window = getCurrentWindow();

    const unlisten = window.onDragDropEvent(async (event) => {
      const dragEvent = event.payload as DragDropEvent;

      switch (dragEvent.type) {
        case "enter": {
          hasExternalFileDragRef.current = dragEvent.paths.length > 0;
          if (!hasExternalFileDragRef.current) {
            dropTargetRef.current = null;
            stopEdgeScroll();
            setActiveDropTarget(null);
          }
          break;
        }
        case "over": {
          if (!hasExternalFileDragRef.current) {
            return;
          }

          const point = normalizePointerCoordinates(dragEvent.position.x, dragEvent.position.y);
          applyEdgeScrollForY(point.y);
          const target = resolveDropTarget(point.x, point.y);
          const targetId = target?.locationId ?? selectedLocationId ?? null;
          const targetKey = target
            ? `${target.activeDropTarget.targetType}:${target.locationId}:${target.folderPath ?? ""}:${
              target.activeDropTarget.relPath ?? ""
            }:${target.activeDropTarget.edge ?? ""}:${target.activeDropTarget.intent}`
            : null;
          const currentKey = dropTargetRef.current
            ? `${dropTargetRef.current.activeDropTarget.targetType}:${dropTargetRef.current.locationId}:${
              dropTargetRef.current.folderPath ?? ""
            }:${dropTargetRef.current.activeDropTarget.relPath ?? ""}:${
              dropTargetRef.current.activeDropTarget.edge ?? ""
            }:${dropTargetRef.current.activeDropTarget.intent}`
            : null;

          if (targetKey !== currentKey) {
            dropTargetRef.current = target
              ?? (targetId
                ? {
                  locationId: targetId,
                  activeDropTarget: {
                    source: "external",
                    locationId: targetId,
                    targetType: "location",
                    intent: "into",
                  },
                }
                : null);
            if (target?.activeDropTarget) {
              setActiveDropTarget(target.activeDropTarget);
            } else if (targetId) {
              setActiveDropTarget({ source: "external", locationId: targetId, targetType: "location", intent: "into" });
            } else {
              setActiveDropTarget(null);
            }
          }
          break;
        }
        case "drop": {
          const droppedPaths = dragEvent.paths;
          const isExternalFileDrop = hasExternalFileDragRef.current || droppedPaths.length > 0;
          const target = dropTargetRef.current;
          const targetId = target?.locationId ?? selectedLocationId;

          hasExternalFileDragRef.current = false;
          dropTargetRef.current = null;
          stopEdgeScroll();
          setActiveDropTarget(null);

          if (!isExternalFileDrop || droppedPaths.length === 0) {
            return;
          }

          if (!targetId) {
            logger.info("External file drop ignored: no target location");
            return;
          }

          const files = droppedPaths.filter((path) => path.toLowerCase().endsWith(".md"));

          if (files.length === 0) {
            logger.info("External file drop ignored: no markdown files");
            showWarnToast("Only .md files can be imported");
            return;
          }

          logger.info(
            f("Importing external files", {
              count: files.length,
              locationId: targetId,
              folderPath: target?.folderPath,
            }),
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
          break;
        }
        default: {
          hasExternalFileDragRef.current = false;
          dropTargetRef.current = null;
          stopEdgeScroll();
          setActiveDropTarget(null);
        }
      }
    });

    return () => {
      stopEdgeScroll();
      unlisten.then((fn) => fn()).catch((error) => {
        logger.error(f("Failed to unlisten from drag-drop events", { error }));
      });
    };
  }, [
    selectedLocationId,
    documents,
    setActiveDropTarget,
    refreshSidebar,
    handleImportExternalFile,
    dropZoneRef,
    applyEdgeScrollForY,
    stopEdgeScroll,
  ]);
}
