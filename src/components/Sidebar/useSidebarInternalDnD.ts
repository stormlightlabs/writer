import {
  announce,
  cleanup as cleanupLiveRegion,
  type DestinationData,
  dropTargetForElements,
  type Edge,
  extractClosestEdge,
  monitorForElements,
  normalizePointerCoordinates,
  resolveDestinationFromPointer,
} from "$dnd";
import {
  checkDropDocumentIntoFolder,
  getFilename,
  getParentDirectoryPath,
  isSidebarDragData,
  pointerFromInput,
  reorderDocumentsInLocation,
  resolveDestinationFromDropTargets,
  type SidebarDragData,
  summarizePointerInput,
  walkUpToValidDestination,
} from "$dnd/sidebar";
import { showErrorToast, showSuccessToast, showWarnToast } from "$state/stores/toasts";
import type { SidebarActiveDropTarget } from "$state/types";
import type { DocMeta, LocationDescriptor } from "$types";
import { f } from "$utils/serialize";
import * as logger from "@tauri-apps/plugin-log";
import type { ChangeEventHandler, DragEvent, FormEvent, ReactNode, RefObject } from "react";
import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { DnDMoveDialog } from "./DnDMoveDialog";

type MoveDropDialogState = {
  sourceType: "document" | "folder";
  sourceLocationId: number;
  sourceRelPath: string;
  sourceTitle: string;
  targetLocationId: number;
};

type UseSidebarInternalDnDArgs = {
  locations: LocationDescriptor[];
  documents: DocMeta[];
  setDocuments: (documents: DocMeta[]) => void;
  setActiveDropTarget: (target: SidebarActiveDropTarget | null) => void;
  reorderFolderSortOrder: (locationId: number, sourcePath: string, destinationPath: string, edge: Edge) => void;
  handleMoveDocument: (
    locationId: number,
    relPath: string,
    newRelPath: string,
    targetLocationId?: number,
  ) => Promise<boolean>;
  handleMoveDirectory: (
    locationId: number,
    relPath: string,
    newRelPath: string,
    targetLocationId?: number,
  ) => Promise<boolean>;
  handleRefreshSidebar: (locationId?: number) => void;
};

type SidebarInternalDnDResult = {
  dropZoneRef: RefObject<HTMLDivElement | null>;
  handleDragOver: (event: DragEvent) => void;
  handleDragLeave: (event: DragEvent) => void;
  isDraggingInternal: boolean;
  dragGhostLabel: string | null;
  activeDragDocumentPath: string | null;
  activeDragDocumentLocationId: number | null;
  suppressActiveDragSourceOpacity: boolean;
  moveDialog: ReactNode;
};

type ResolvedDropDestination = {
  pointerDestination: DestinationData | null;
  dropTargetDestination: DestinationData | null;
  rawDestination: DestinationData | null;
  destination: DestinationData | null;
  isNoopDrop: boolean;
};

const UNSET_DROP_DESTINATION = Symbol("unset-drop-destination");
const EDGE_SCROLL_THRESHOLD_PX = 40;
const EDGE_SCROLL_STEP_PX = 14;
const DRAG_LEAVE_CLEAR_DELAY_MS = 40;

function resolveDropDestination(
  sourceData: SidebarDragData,
  nativeDragPos: { x: number; y: number } | null,
  locationInput: unknown,
  dropTargets: unknown,
): ResolvedDropDestination {
  const pos = nativeDragPos ?? pointerFromInput(locationInput);
  const pointerDestination = pos ? resolveDestinationFromPointer(pos.x, pos.y)?.destination ?? null : null;
  const dropTargetDestination = resolveDestinationFromDropTargets(dropTargets);

  let rawDestination = pointerDestination && pointerDestination.targetType !== "location"
    ? pointerDestination
    : (dropTargetDestination ?? pointerDestination);

  if (
    rawDestination?.targetType === "document"
    && rawDestination.relPath
    && dropTargetDestination?.targetType === "document"
    && dropTargetDestination.relPath === rawDestination.relPath
    && dropTargetDestination.locationId === rawDestination.locationId
  ) {
    rawDestination = dropTargetDestination;
  }

  const isNoopDrop = sourceData.type === "document"
    && rawDestination?.folderPath !== undefined
    && checkDropDocumentIntoFolder(sourceData, rawDestination.locationId, rawDestination.folderPath) === "noop";
  const rawEdge = rawDestination ? extractClosestEdge(rawDestination) : null;
  const isFolderSiblingReorder = sourceData.type === "folder"
    && rawDestination?.targetType === "folder"
    && rawDestination.folderPath !== undefined
    && (rawEdge === "top" || rawEdge === "bottom")
    && sourceData.locationId === rawDestination.locationId
    && sourceData.relPath !== rawDestination.folderPath
    && getParentDirectoryPath(sourceData.relPath) === getParentDirectoryPath(rawDestination.folderPath);

  return {
    pointerDestination,
    dropTargetDestination,
    rawDestination,
    destination: rawDestination
      ? (isFolderSiblingReorder ? rawDestination : walkUpToValidDestination(sourceData, rawDestination))
      : null,
    isNoopDrop,
  };
}

export function useSidebarInternalDnD(
  {
    locations,
    documents,
    setDocuments,
    setActiveDropTarget,
    reorderFolderSortOrder,
    handleMoveDocument,
    handleMoveDirectory,
    handleRefreshSidebar,
  }: UseSidebarInternalDnDArgs,
): SidebarInternalDnDResult {
  const [moveDropDialog, setMoveDropDialog] = useState<MoveDropDialogState | null>(null);
  const [moveDropPath, setMoveDropPath] = useState("");
  const [isMovingDrop, setIsMovingDrop] = useState(false);
  const [isDraggingInternal, setIsDraggingInternal] = useState(false);
  const [dragGhostLabel, setDragGhostLabel] = useState<string | null>(null);
  const [activeDragDocumentPath, setActiveDragDocumentPath] = useState<string | null>(null);
  const [activeDragDocumentLocationId, setActiveDragDocumentLocationId] = useState<number | null>(null);
  const [suppressActiveDragSourceOpacity, setSuppressActiveDragSourceOpacity] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const nativeDragPosRef = useRef<{ x: number; y: number } | null>(null);
  const resolvedDestinationRef = useRef<DestinationData | null | typeof UNSET_DROP_DESTINATION>(UNSET_DROP_DESTINATION);
  const edgeScrollRafRef = useRef<number | null>(null);
  const edgeScrollDirectionRef = useRef<1 | -1 | 0>(0);
  const dragLeaveClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelDeferredDragLeaveClear = useCallback(() => {
    if (dragLeaveClearTimerRef.current !== null) {
      globalThis.clearTimeout(dragLeaveClearTimerRef.current);
      dragLeaveClearTimerRef.current = null;
    }
  }, []);

  const stopEdgeScroll = useCallback(() => {
    if (edgeScrollRafRef.current !== null) {
      cancelAnimationFrame(edgeScrollRafRef.current);
      edgeScrollRafRef.current = null;
    }
    edgeScrollDirectionRef.current = 0;
  }, []);

  const applyEdgeScrollForY = useCallback((clientY: number | null) => {
    const scrollContainer = dropZoneRef.current;
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
      const container = dropZoneRef.current;
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
  }, [stopEdgeScroll]);

  const handleDragOver = useCallback((event: DragEvent) => {
    cancelDeferredDragLeaveClear();
    const normalized = normalizePointerCoordinates(event.clientX, event.clientY);
    nativeDragPosRef.current = normalized;
    applyEdgeScrollForY(normalized.y);
  }, [applyEdgeScrollForY, cancelDeferredDragLeaveClear]);

  const handleDragLeave = useCallback((event: DragEvent) => {
    const container = dropZoneRef.current;
    if (!container) {
      return;
    }

    const related = event.relatedTarget;
    if (related instanceof Node && container.contains(related)) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const leavePoint = { x: event.clientX, y: event.clientY };
    const pointInsideContainer = leavePoint.x >= rect.left && leavePoint.x <= rect.right
      && leavePoint.y >= rect.top
      && leavePoint.y <= rect.bottom;
    if (pointInsideContainer) {
      return;
    }

    cancelDeferredDragLeaveClear();
    dragLeaveClearTimerRef.current = globalThis.setTimeout(() => {
      dragLeaveClearTimerRef.current = null;
      const currentContainer = dropZoneRef.current;
      const latestPoint = nativeDragPosRef.current ?? leavePoint;
      if (!currentContainer) {
        nativeDragPosRef.current = null;
        stopEdgeScroll();
        return;
      }

      const currentRect = currentContainer.getBoundingClientRect();
      const stillInside = latestPoint.x >= currentRect.left && latestPoint.x <= currentRect.right
        && latestPoint.y >= currentRect.top
        && latestPoint.y <= currentRect.bottom;
      if (stillInside) {
        return;
      }

      nativeDragPosRef.current = null;
      stopEdgeScroll();
    }, DRAG_LEAVE_CLEAR_DELAY_MS);
  }, [cancelDeferredDragLeaveClear, stopEdgeScroll]);

  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setActiveDropTarget(null);
      setIsDraggingInternal(false);
      setDragGhostLabel(null);
      setSuppressActiveDragSourceOpacity(false);
      setActiveDragDocumentPath(null);
      setActiveDragDocumentLocationId(null);
      resolvedDestinationRef.current = UNSET_DROP_DESTINATION;
      cancelDeferredDragLeaveClear();
      stopEdgeScroll();
    };

    globalThis.addEventListener("dragend", handleGlobalDragEnd);
    return () => {
      globalThis.removeEventListener("dragend", handleGlobalDragEnd);
    };
  }, [cancelDeferredDragLeaveClear, setActiveDropTarget, stopEdgeScroll]);

  useEffect(() => {
    const dropZoneElement = dropZoneRef.current;
    if (!dropZoneElement) {
      return;
    }

    return dropTargetForElements({
      element: dropZoneElement,
      canDrop: ({ source }) => isSidebarDragData(source.data),
      getData: ({ input }) => {
        const pos = nativeDragPosRef.current ?? pointerFromInput(input);
        const resolved = pos ? resolveDestinationFromPointer(pos.x, pos.y) : null;
        if (!resolved) {
          return { targetType: "none" as const };
        }
        return resolved.destination;
      },
    });
  }, []);

  useEffect(() => {
    const getLocationName = (locationId: number): string =>
      locations.find((location) => location.id === locationId)?.name ?? "location";

    const stop = monitorForElements({
      canMonitor: ({ source }) => isSidebarDragData(source.data),
      onDragStart: ({ source }) => {
        if (!isSidebarDragData(source.data)) {
          return;
        }
        setIsDraggingInternal(true);
        setDragGhostLabel(source.data.title);
        resolvedDestinationRef.current = UNSET_DROP_DESTINATION;
        setActiveDropTarget(null);
        setSuppressActiveDragSourceOpacity(false);
        if (source.data.type === "document") {
          setActiveDragDocumentPath(source.data.relPath);
          setActiveDragDocumentLocationId(source.data.locationId);
        } else {
          setActiveDragDocumentPath(null);
          setActiveDragDocumentLocationId(null);
        }
        announce(`Picked up ${source.data.title}`);
      },
      onDropTargetChange: ({ source, location }) => {
        if (!isSidebarDragData(source.data)) {
          setActiveDropTarget(null);
          setSuppressActiveDragSourceOpacity(false);
          resolvedDestinationRef.current = null;
          return;
        }

        const resolution = resolveDropDestination(
          source.data,
          nativeDragPosRef.current,
          location.current.input,
          location.current.dropTargets,
        );
        resolvedDestinationRef.current = resolution.destination;
        setSuppressActiveDragSourceOpacity(resolution.isNoopDrop);
        const destinationData = resolution.destination;

        if (!destinationData) {
          setActiveDropTarget(null);
          return;
        }

        const edge = extractClosestEdge(destinationData);
        setActiveDropTarget({
          source: "internal",
          locationId: destinationData.locationId,
          targetType: destinationData.targetType ?? "location",
          ...(destinationData.folderPath ? { folderPath: destinationData.folderPath } : {}),
          ...(destinationData.relPath ? { relPath: destinationData.relPath } : {}),
          ...(edge ? { edge } : {}),
          intent: edge ? "between" : "into",
        });

        if (destinationData.folderPath) {
          announce(`Over ${destinationData.folderPath} in ${getLocationName(destinationData.locationId)}`);
          return;
        }

        if (destinationData.targetType === "document" && destinationData.relPath) {
          announce(`Over ${getFilename(destinationData.relPath)}`);
          return;
        }

        announce(`Over ${getLocationName(destinationData.locationId)}`);
      },
      onDrop: ({ source, location }) => {
        setActiveDropTarget(null);
        setIsDraggingInternal(false);
        setDragGhostLabel(null);
        setSuppressActiveDragSourceOpacity(false);
        setActiveDragDocumentPath(null);
        setActiveDragDocumentLocationId(null);
        cancelDeferredDragLeaveClear();
        stopEdgeScroll();

        if (!isSidebarDragData(source.data)) {
          resolvedDestinationRef.current = UNSET_DROP_DESTINATION;
          return;
        }

        const resolution = resolveDropDestination(
          source.data,
          nativeDragPosRef.current,
          location.current.input,
          location.current.dropTargets,
        );
        const destinationData = resolvedDestinationRef.current === UNSET_DROP_DESTINATION
          ? resolution.destination
          : resolvedDestinationRef.current;
        resolvedDestinationRef.current = UNSET_DROP_DESTINATION;
        logger.warn(
          f("Sidebar DnD drop trace", {
            source: source.data,
            pointer: summarizePointerInput(location.current.input),
            pointerDestination: resolution.pointerDestination,
            dropTargetDestination: resolution.dropTargetDestination,
            rawDestination: resolution.rawDestination,
            resolvedDestination: destinationData,
          }),
        );

        if (!destinationData) {
          announce(`Dropped ${source.data.title}`);
          showWarnToast(
            source.data.type === "folder"
              ? "Drop target is not valid for moving this folder"
              : "Drop target is not valid for moving this file",
          );
          return;
        }

        const sourceData = source.data;
        const sourceFilename = getFilename(sourceData.relPath);
        const sourceParentPath = getParentDirectoryPath(sourceData.relPath);
        const modifierDrop = location.current.input.altKey;
        const resolvedTargetLocationId = destinationData.locationId;
        const destinationParentPath = destinationData.folderPath
          ?? (destinationData.targetType === "document" && destinationData.relPath
            ? getParentDirectoryPath(destinationData.relPath)
            : "");
        const destinationEdge = extractClosestEdge(destinationData);

        if (sourceData.type === "folder") {
          if (
            destinationData.targetType === "folder" && destinationData.folderPath
            && (destinationEdge === "top" || destinationEdge === "bottom")
            && resolvedTargetLocationId === sourceData.locationId
            && getParentDirectoryPath(sourceData.relPath) === getParentDirectoryPath(destinationData.folderPath)
          ) {
            reorderFolderSortOrder(
              sourceData.locationId,
              sourceData.relPath,
              destinationData.folderPath,
              destinationEdge,
            );
            announce(
              `Moved ${sourceData.title} ${destinationEdge === "top" ? "before" : "after"} ${
                getFilename(destinationData.folderPath)
              }`,
            );
            return;
          }

          const destinationFolderPath = destinationData.folderPath ?? "";
          const siblingParentPath = destinationFolderPath
            ? getParentDirectoryPath(destinationFolderPath)
            : destinationParentPath;
          const nextParentPath = destinationEdge === "top" || destinationEdge === "bottom"
            ? siblingParentPath
            : destinationFolderPath || destinationParentPath;
          const newRelPath = nextParentPath ? `${nextParentPath}/${sourceFilename}` : sourceFilename;

          if (modifierDrop) {
            setMoveDropDialog({
              sourceType: "folder",
              sourceLocationId: sourceData.locationId,
              sourceRelPath: sourceData.relPath,
              sourceTitle: sourceData.title,
              targetLocationId: resolvedTargetLocationId,
            });
            setMoveDropPath(newRelPath);
            announce(`Choose destination path for ${sourceData.title}`);
            return;
          }

          if (newRelPath === sourceData.relPath) {
            showWarnToast("Drop target is not valid for moving this folder");
            return;
          }

          void Promise.resolve(
            handleMoveDirectory(sourceData.locationId, sourceData.relPath, newRelPath, resolvedTargetLocationId),
          ).then((moved) => {
            if (!moved) {
              announce(`Could not move ${sourceData.title}`);
              showErrorToast(`Could not move ${sourceData.title}`);
              return;
            }

            handleRefreshSidebar(sourceData.locationId);
            if (resolvedTargetLocationId !== sourceData.locationId) {
              handleRefreshSidebar(resolvedTargetLocationId);
            }
            announce(`Moved ${sourceData.title}`);
            showSuccessToast(`Moved ${sourceData.title}`);
          }).catch((error: unknown) => {
            logger.error(f("Failed to move folder", { source: sourceData, dest: destinationData, error }));
            showErrorToast(`Could not move ${sourceData.title}`);
          });
          return;
        }

        if (modifierDrop) {
          const nextPathFromDestination = destinationParentPath
            ? `${destinationParentPath}/${sourceFilename}`
            : sourceFilename;
          const keepsSameParent = resolvedTargetLocationId === sourceData.locationId
            && sourceParentPath === destinationParentPath;
          const initialPath = keepsSameParent ? sourceData.relPath : nextPathFromDestination;

          setMoveDropDialog({
            sourceType: "document",
            sourceLocationId: sourceData.locationId,
            sourceRelPath: sourceData.relPath,
            sourceTitle: sourceData.title,
            targetLocationId: resolvedTargetLocationId,
          });
          setMoveDropPath(initialPath);
          announce(`Choose destination path for ${sourceData.title}`);
          return;
        }

        const refreshDocumentLists = () => {
          handleRefreshSidebar(sourceData.locationId);
          if (resolvedTargetLocationId !== sourceData.locationId) {
            handleRefreshSidebar(resolvedTargetLocationId);
          }
        };

        if (destinationData.folderPath) {
          const newRelPath = `${destinationData.folderPath}/${sourceFilename}`;
          void Promise.resolve(
            handleMoveDocument(sourceData.locationId, sourceData.relPath, newRelPath, resolvedTargetLocationId),
          ).then((moved) => {
            if (!moved) {
              announce(`Could not move ${sourceData.title}`);
              showErrorToast(`Could not move ${sourceData.title}`);
              return;
            }

            refreshDocumentLists();
            announce(`Moved ${sourceData.title} to ${getLocationName(resolvedTargetLocationId)}`);
            showSuccessToast(`Moved ${sourceData.title} to ${getLocationName(resolvedTargetLocationId)}`);
          }).catch((error: unknown) => {
            logger.error(
              f("Failed to move document into folder", { source: sourceData, dest: destinationData, error }),
            );
            showErrorToast(`Could not move ${sourceData.title}`);
          });
          return;
        }

        if (destinationData.targetType === "document" && destinationData.relPath) {
          const newRelPath = destinationParentPath ? `${destinationParentPath}/${sourceFilename}` : sourceFilename;
          const changedParentFolder = sourceParentPath !== destinationParentPath;

          if (changedParentFolder) {
            void Promise.resolve(
              handleMoveDocument(sourceData.locationId, sourceData.relPath, newRelPath, resolvedTargetLocationId),
            ).then((moved) => {
              if (!moved) {
                announce(`Could not move ${sourceData.title}`);
                showErrorToast(`Could not move ${sourceData.title}`);
                return;
              }

              refreshDocumentLists();
              announce(`Moved ${sourceData.title} to ${destinationParentPath || "location root"}`);
              showSuccessToast(`Moved ${sourceData.title}`);
            }).catch((error: unknown) => {
              logger.error(
                f("Failed to move document alongside destination neighbor", {
                  source: sourceData,
                  dest: destinationData,
                  error,
                }),
              );
              showErrorToast(`Could not move ${sourceData.title}`);
            });
            return;
          }
        }

        if (resolvedTargetLocationId !== sourceData.locationId) {
          const crossLocationPath = destinationParentPath
            ? `${destinationParentPath}/${sourceFilename}`
            : sourceFilename;
          void Promise.resolve(
            handleMoveDocument(sourceData.locationId, sourceData.relPath, crossLocationPath, resolvedTargetLocationId),
          ).then((moved) => {
            if (!moved) {
              announce(`Could not move ${sourceData.title}`);
              showErrorToast(`Could not move ${sourceData.title}`);
              return;
            }

            refreshDocumentLists();
            announce(`Moved ${sourceData.title} to ${getLocationName(resolvedTargetLocationId)}`);
            showSuccessToast(`Moved ${sourceData.title} to ${getLocationName(resolvedTargetLocationId)}`);
          }).catch((error: unknown) => {
            logger.error(f("Failed to move document", { source: sourceData, dest: destinationData, error }));
            showErrorToast(`Could not move ${sourceData.title}`);
          });
          return;
        }

        if (destinationData.targetType === "location" && sourceParentPath !== "") {
          void Promise.resolve(
            handleMoveDocument(sourceData.locationId, sourceData.relPath, sourceFilename, resolvedTargetLocationId),
          ).then((moved) => {
            if (!moved) {
              announce(`Could not move ${sourceData.title}`);
              showErrorToast(`Could not move ${sourceData.title}`);
              return;
            }

            refreshDocumentLists();
            announce(`Moved ${sourceData.title} to location root`);
            showSuccessToast(`Moved ${sourceData.title}`);
          }).catch((error: unknown) => {
            logger.error(
              f("Failed to move document to location root", { source: sourceData, dest: destinationData, error }),
            );
            showErrorToast(`Could not move ${sourceData.title}`);
          });
          return;
        }

        if (
          destinationData.targetType === "document"
          && destinationData.relPath
          && (destinationEdge === "top" || destinationEdge === "bottom")
        ) {
          setDocuments(
            reorderDocumentsInLocation(
              documents,
              sourceData.locationId,
              sourceData.relPath,
              destinationData.relPath,
              destinationEdge,
            ),
          );
          announce(
            `Moved ${sourceData.title} ${destinationEdge === "top" ? "before" : "after"} ${
              getFilename(destinationData.relPath)
            }`,
          );
          return;
        }

        announce(`Could not move ${sourceData.title} from that drop target`);
        showWarnToast("Drop target is not valid for moving this file");
      },
    });

    return () => {
      setActiveDropTarget(null);
      setIsDraggingInternal(false);
      setDragGhostLabel(null);
      setSuppressActiveDragSourceOpacity(false);
      setActiveDragDocumentPath(null);
      setActiveDragDocumentLocationId(null);
      resolvedDestinationRef.current = UNSET_DROP_DESTINATION;
      cancelDeferredDragLeaveClear();
      stopEdgeScroll();
      stop();
      cleanupLiveRegion();
    };
  }, [
    documents,
    handleMoveDirectory,
    handleMoveDocument,
    handleRefreshSidebar,
    locations,
    reorderFolderSortOrder,
    setDocuments,
    setActiveDropTarget,
    cancelDeferredDragLeaveClear,
    stopEdgeScroll,
  ]);

  const closeMoveDropDialog = useCallback(() => {
    if (isMovingDrop) {
      return;
    }
    setMoveDropDialog(null);
    setMoveDropPath("");
  }, [isMovingDrop]);

  const handleMoveDropPathChange: ChangeEventHandler<HTMLInputElement> = useCallback((event) => {
    setMoveDropPath(event.currentTarget.value);
  }, []);

  const handleMoveDropSubmit = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    if (!moveDropDialog) {
      return;
    }

    const nextPath = moveDropPath.trim();
    if (!nextPath) {
      return;
    }

    setIsMovingDrop(true);
    try {
      const moved = moveDropDialog.sourceType === "folder"
        ? await handleMoveDirectory(
          moveDropDialog.sourceLocationId,
          moveDropDialog.sourceRelPath,
          nextPath,
          moveDropDialog.targetLocationId,
        )
        : await handleMoveDocument(
          moveDropDialog.sourceLocationId,
          moveDropDialog.sourceRelPath,
          nextPath,
          moveDropDialog.targetLocationId,
        );

      if (!moved) {
        announce(`Could not move ${moveDropDialog.sourceTitle}`);
        showErrorToast(`Could not move ${moveDropDialog.sourceTitle}`);
        return;
      }

      handleRefreshSidebar(moveDropDialog.sourceLocationId);
      if (moveDropDialog.targetLocationId !== moveDropDialog.sourceLocationId) {
        handleRefreshSidebar(moveDropDialog.targetLocationId);
      }
      announce(`Moved ${moveDropDialog.sourceTitle}`);
      showSuccessToast(`Moved ${moveDropDialog.sourceTitle}`);
      setMoveDropDialog(null);
      setMoveDropPath("");
    } catch (error: unknown) {
      logger.error(f("Failed to move dropped document from dialog", { moveDropDialog, error }));
      showErrorToast(`Could not move ${moveDropDialog.sourceTitle}`);
    } finally {
      setIsMovingDrop(false);
    }
  }, [handleMoveDirectory, handleMoveDocument, handleRefreshSidebar, moveDropDialog, moveDropPath]);

  const moveDropPathTrimmed = moveDropPath.trim();
  const isMoveDropUnchanged = moveDropDialog
    ? moveDropDialog.sourceLocationId === moveDropDialog.targetLocationId
      && moveDropDialog.sourceRelPath === moveDropPathTrimmed
    : false;

  const moveDialog = createElement(DnDMoveDialog, {
    isOpen: moveDropDialog !== null,
    onClose: closeMoveDropDialog,
    entityLabel: moveDropDialog?.sourceType === "folder" ? "folder" : "document",
    formId: "sidebar-drop-move-form",
    path: moveDropPath,
    onPathChange: handleMoveDropPathChange,
    onSubmit: handleMoveDropSubmit,
    isPending: isMovingDrop,
    confirmDisabled: !moveDropPathTrimmed || isMoveDropUnchanged,
  });

  return {
    dropZoneRef,
    handleDragOver,
    handleDragLeave,
    isDraggingInternal,
    dragGhostLabel,
    activeDragDocumentPath,
    activeDragDocumentLocationId,
    suppressActiveDragSourceOpacity,
    moveDialog,
  };
}
