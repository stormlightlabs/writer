export type Edge = "top" | "bottom";

type DragInput = { clientX: number; clientY: number; x: number; y: number; altKey: boolean };
type DragSource = { data: unknown; element: HTMLElement };
type DropTarget = { element: HTMLElement; data: unknown };
type DragLocation = { dropTargets: DropTarget[]; input: DragInput };
type EdgeWith<T extends object> = T & { [EDGE_KEY]?: Edge };
type AttachOpts = { input: DragInput; element: HTMLElement; allowedEdges: Edge[] };
type ResolvedDestination = { destination: DestinationData; element: HTMLElement };

type DraggableArgs = {
  element: HTMLElement;
  getInitialData: () => unknown;
  onDragStart?: () => void;
  onDrop?: () => void;
};

type DropTargetArgs = {
  element: HTMLElement;
  canDrop: (args: { source: DragSource }) => boolean;
  getData: (args: { source: DragSource; input: DragInput }) => unknown;
};

type MonitorArgs = {
  canMonitor?: (args: { source: DragSource }) => boolean;
  onDragStart?: (args: { source: DragSource }) => void;
  onDropTargetChange?: (
    args: { source: DragSource; location: { current: DragLocation; previous: DragLocation } },
  ) => void;
  onDrop?: (args: { source: DragSource; location: { current: DragLocation; previous: DragLocation } }) => void;
};

type ActiveDrag = {
  source: DragSource;
  sourceOnDrop?: () => void;
  currentLocation: DragLocation;
  previousLocation: DragLocation;
};

type LiveRegionState = { node: HTMLElement | null; timer: ReturnType<typeof setTimeout> | null };

export type DestinationData = {
  locationId: number;
  relPath?: string;
  folderPath?: string;
  targetType?: "location" | "document" | "folder";
};

const INTERNAL_MIME = "application/x-writer-sidebar-dnd";
const EDGE_KEY = "__writerClosestEdge";
const LIVE_REGION_ID = "writer-dnd-live-region";
const DROP_ROW_SELECTOR =
  "[data-drop-document-row][data-location-id], [data-drop-folder-row][data-location-id], [data-drop-location-root][data-location-id]";
const LOCATION_SELECTOR = "[data-location-id]";

const monitors = new Set<MonitorArgs>();
let activeDrag: ActiveDrag | null = null;
let lastKnownPoint: { x: number; y: number } | null = null;

const liveRegionState: LiveRegionState = { node: null, timer: null };

function makeEmptyLocation(input: DragInput): DragLocation {
  return { dropTargets: [], input };
}

function keyOfDropTarget(target: DropTarget): string {
  const data = target.data;
  if (!data || typeof data !== "object") {
    return `${String(data)}`;
  }

  const maybe = data as Partial<DestinationData & { [EDGE_KEY]?: Edge | null }>;
  const edge = maybe[EDGE_KEY] ?? "none";
  return `${maybe.locationId ?? "none"}|${maybe.targetType ?? "unknown"}|${maybe.folderPath ?? ""}|${
    maybe.relPath ?? ""
  }|${edge}`;
}

function areDropTargetsEqual(left: DropTarget[], right: DropTarget[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (keyOfDropTarget(left[index]) !== keyOfDropTarget(right[index])) {
      return false;
    }
  }

  return true;
}

function shouldNotifyMonitor(monitor: MonitorArgs, source: DragSource): boolean {
  return monitor.canMonitor ? monitor.canMonitor({ source }) : true;
}

function toNumeric(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  if (!Number.isFinite(value)) {
    return null;
  }

  return value;
}

function isPointInViewport(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x <= window.innerWidth && y <= window.innerHeight;
}

function isPointInsideRect(x: number, y: number, rect: DOMRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

/**
 * When both are valid, check if elements exist at either position.
 * On Tauri/macOS with Retina displays, DragEvent coordinates can be
 * in physical pixels while the DOM layout uses CSS pixels. Prefer
 * whichever coordinate finds an actual sidebar drop target.
 */
function normalizePoint(rawX: number, rawY: number): { x: number; y: number } {
  const dpr = window.devicePixelRatio || 1;
  if (dpr <= 1) {
    return { x: rawX, y: rawY };
  }

  const direct = { x: rawX, y: rawY };
  const scaled = { x: rawX / dpr, y: rawY / dpr };

  const directValid = isPointInViewport(direct.x, direct.y);
  const scaledValid = isPointInViewport(scaled.x, scaled.y);

  if (directValid && !scaledValid) {
    return direct;
  }
  if (!directValid && scaledValid) {
    return scaled;
  }

  if (directValid && scaledValid) {
    const selector =
      `[data-drop-document-row], [data-drop-folder-row], [data-drop-location-root], ${LOCATION_SELECTOR}`;
    const directHit = document.elementFromPoint(direct.x, direct.y);
    const scaledHit = document.elementFromPoint(scaled.x, scaled.y);
    const directMatch = directHit instanceof HTMLElement && directHit.closest(selector);
    const scaledMatch = scaledHit instanceof HTMLElement && scaledHit.closest(selector);

    if (scaledMatch && !directMatch) {
      return scaled;
    }
    return direct;
  }

  if (lastKnownPoint) {
    return lastKnownPoint;
  }

  return {
    x: Math.max(0, Math.min(window.innerWidth, direct.x)),
    y: Math.max(0, Math.min(window.innerHeight, direct.y)),
  };
}

function readDragInputLike(input: Partial<DragInput>): DragInput {
  const rawX = toNumeric(input.clientX ?? input.x) ?? 0;
  const rawY = toNumeric(input.clientY ?? input.y) ?? 0;
  const normalized = normalizePoint(rawX, rawY);
  lastKnownPoint = normalized;

  return {
    clientX: normalized.x,
    clientY: normalized.y,
    x: normalized.x,
    y: normalized.y,
    altKey: Boolean(input.altKey),
  };
}

function readDragInputFromEvent(event: DragEvent): DragInput {
  return readDragInputLike({
    clientX: event.clientX,
    clientY: event.clientY,
    x: event.x,
    y: event.y,
    altKey: event.altKey,
  });
}

function updateLocationForMonitors(nextLocation: DragLocation): void {
  if (!activeDrag) {
    return;
  }

  if (areDropTargetsEqual(activeDrag.currentLocation.dropTargets, nextLocation.dropTargets)) {
    activeDrag.currentLocation = nextLocation;
    return;
  }

  activeDrag.previousLocation = activeDrag.currentLocation;
  activeDrag.currentLocation = nextLocation;

  for (const monitor of monitors) {
    if (!shouldNotifyMonitor(monitor, activeDrag.source)) {
      continue;
    }

    monitor.onDropTargetChange?.({
      source: activeDrag.source,
      location: { current: activeDrag.currentLocation, previous: activeDrag.previousLocation },
    });
  }
}

function finalizeActiveDrag(input: DragInput): void {
  if (!activeDrag) {
    return;
  }

  const current = activeDrag.currentLocation.dropTargets.length > 0
    ? activeDrag.currentLocation
    : makeEmptyLocation(input);
  const previous = activeDrag.previousLocation;
  const source = activeDrag.source;
  const sourceOnDrop = activeDrag.sourceOnDrop;

  for (const monitor of monitors) {
    if (!shouldNotifyMonitor(monitor, source)) {
      continue;
    }

    monitor.onDrop?.({ source, location: { current, previous } });
  }

  sourceOnDrop?.();
  activeDrag = null;
  lastKnownPoint = null;
}

function refreshDropEffect(event: DragEvent, canDrop: boolean): void {
  if (!event.dataTransfer) {
    return;
  }

  event.dataTransfer.dropEffect = canDrop ? "move" : "none";
}

function toDragGhostLabel(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "Moving item";
  }

  const maybe = data as Partial<{ title: string; relPath: string; rel_path: string }>;
  if (typeof maybe.title === "string" && maybe.title.trim()) {
    return maybe.title.trim();
  }

  const relPath = typeof maybe.relPath === "string"
    ? maybe.relPath
    : (typeof maybe.rel_path === "string" ? maybe.rel_path : "");
  if (!relPath) {
    return "Moving item";
  }

  const parts = relPath.split(/[\\/]+/).filter(Boolean);
  return parts.at(-1) ?? relPath;
}

function startInternalDrag(event: DragEvent, args: DraggableArgs): void {
  const data = args.getInitialData();
  if (data === undefined) {
    return;
  }

  const input = readDragInputFromEvent(event);
  activeDrag = {
    source: { data, element: args.element },
    sourceOnDrop: args.onDrop,
    currentLocation: makeEmptyLocation(input),
    previousLocation: makeEmptyLocation(input),
  };

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(INTERNAL_MIME, "1");
    event.dataTransfer.setData("text/plain", "writer-sidebar-drag");

    if (typeof event.dataTransfer.setDragImage === "function") {
      const ghost = document.querySelector<HTMLElement>("#sidebar-drag-ghost");
      if (ghost) {
        ghost.textContent = toDragGhostLabel(data);
        event.dataTransfer.setDragImage(ghost, 12, 12);
      }
    }
  }

  args.onDragStart?.();

  for (const monitor of monitors) {
    if (!shouldNotifyMonitor(monitor, activeDrag.source)) {
      continue;
    }

    monitor.onDragStart?.({ source: activeDrag.source });
  }
}

export function draggable(args: DraggableArgs): () => void {
  const { element } = args;
  const previousDraggable = element.draggable;
  element.draggable = true;

  const onDragStart = (event: DragEvent) => startInternalDrag(event, args);

  const onDragEnd = (event: DragEvent) => {
    if (!activeDrag || activeDrag.source.element !== element) {
      return;
    }

    if (event.dataTransfer?.dropEffect === "none") {
      activeDrag.sourceOnDrop?.();
      activeDrag = null;
      lastKnownPoint = null;
      return;
    }

    const input = readDragInputFromEvent(event);
    finalizeActiveDrag(input);
  };

  element.addEventListener("dragstart", onDragStart);
  element.addEventListener("dragend", onDragEnd);

  return () => {
    element.removeEventListener("dragstart", onDragStart);
    element.removeEventListener("dragend", onDragEnd);
    element.draggable = previousDraggable;
    if (activeDrag?.source.element === element) {
      activeDrag = null;
      lastKnownPoint = null;
    }
  };
}

export function dropTargetForElements(args: DropTargetArgs): () => void {
  const { element } = args;

  const resolveNextLocation = (input: DragInput): DragLocation => {
    if (!activeDrag) {
      return makeEmptyLocation(input);
    }

    if (!args.canDrop({ source: activeDrag.source })) {
      return makeEmptyLocation(input);
    }

    const data = args.getData({ source: activeDrag.source, input });
    if (
      data === null || data === undefined
      || (typeof data === "object" && data && "targetType" in data
        && (data as { targetType?: unknown }).targetType === "none")
    ) {
      return makeEmptyLocation(input);
    }

    return { dropTargets: [{ element, data }], input };
  };

  const onDragOver = (event: DragEvent) => {
    if (!activeDrag) {
      return;
    }

    const input = readDragInputFromEvent(event);
    const nextLocation = resolveNextLocation(input);
    const canDrop = nextLocation.dropTargets.length > 0;
    refreshDropEffect(event, canDrop);
    if (canDrop) {
      event.preventDefault();
    }
    updateLocationForMonitors(nextLocation);
  };

  const onDragEnter = (event: DragEvent) => {
    if (!activeDrag) {
      return;
    }

    const input = readDragInputFromEvent(event);
    updateLocationForMonitors(resolveNextLocation(input));
  };

  const onDragLeave = (event: DragEvent) => {
    if (!activeDrag) {
      return;
    }

    const related = event.relatedTarget;
    if (related instanceof Node && element.contains(related)) {
      return;
    }

    const input = readDragInputFromEvent(event);
    const rect = element.getBoundingClientRect();
    if (isPointInsideRect(input.clientX, input.clientY, rect)) {
      return;
    }
    updateLocationForMonitors(makeEmptyLocation(input));
  };

  const onDrop = (event: DragEvent) => {
    if (!activeDrag) {
      return;
    }

    const input = readDragInputFromEvent(event);
    const nextLocation = resolveNextLocation(input);
    if (nextLocation.dropTargets.length > 0) {
      event.preventDefault();
    }
    updateLocationForMonitors(nextLocation);
    finalizeActiveDrag(input);
  };

  element.addEventListener("dragover", onDragOver);
  element.addEventListener("dragenter", onDragEnter);
  element.addEventListener("dragleave", onDragLeave);
  element.addEventListener("drop", onDrop);

  return () => {
    element.removeEventListener("dragover", onDragOver);
    element.removeEventListener("dragenter", onDragEnter);
    element.removeEventListener("dragleave", onDragLeave);
    element.removeEventListener("drop", onDrop);
  };
}

export function monitorForElements(args: MonitorArgs): () => void {
  monitors.add(args);
  return () => {
    monitors.delete(args);
  };
}

export function attachClosestEdge<T extends object>(data: T, options: AttachOpts): EdgeWith<T> {
  if (options.allowedEdges.length === 0) {
    return data;
  }

  const rect = options.element.getBoundingClientRect();
  const midpoint = rect.top + rect.height / 2;
  const edge: Edge = options.input.clientY <= midpoint ? "top" : "bottom";
  if (!options.allowedEdges.includes(edge)) {
    return data;
  }

  return { ...(data as Record<string, unknown>), [EDGE_KEY]: edge } as T & { [EDGE_KEY]?: Edge };
}

export function extractClosestEdge(value: unknown): Edge | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const edge = (value as { [EDGE_KEY]?: unknown })[EDGE_KEY];
  if (edge === "top" || edge === "bottom") {
    return edge;
  }

  return null;
}

function ensureLiveRegion(): HTMLElement {
  const existing = document.querySelector<HTMLElement>(`#${LIVE_REGION_ID}`);
  if (existing instanceof HTMLElement) {
    liveRegionState.node = existing;
    return existing;
  }

  const node = document.createElement("div");
  node.id = LIVE_REGION_ID;
  node.setAttribute("role", "status");
  node.setAttribute("aria-live", "polite");
  node.setAttribute("aria-atomic", "true");
  node.style.position = "fixed";
  node.style.width = "1px";
  node.style.height = "1px";
  node.style.overflow = "hidden";
  node.style.clipPath = "inset(50%)";
  node.style.whiteSpace = "nowrap";
  node.style.pointerEvents = "none";
  document.body.append(node);
  liveRegionState.node = node;
  return node;
}

export function announce(message: string): void {
  if (!message.trim()) {
    return;
  }

  const liveRegion = ensureLiveRegion();
  if (liveRegionState.timer) {
    clearTimeout(liveRegionState.timer);
  }

  liveRegion.textContent = "";
  liveRegionState.timer = setTimeout(() => {
    liveRegion.textContent = message;
  }, 10);
}

export function cleanup(): void {
  if (liveRegionState.timer) {
    clearTimeout(liveRegionState.timer);
    liveRegionState.timer = null;
  }

  liveRegionState.node?.remove();
  liveRegionState.node = null;
}

function parseLocationId(locationIdRaw: string | undefined): number | null {
  if (!locationIdRaw) {
    return null;
  }

  const locationId = parseInt(locationIdRaw, 10);
  return Number.isNaN(locationId) ? null : locationId;
}

function resolveDestinationAtPoint(
  x: number,
  y: number,
): { destination: DestinationData; element: HTMLElement } | null {
  const hitElements = typeof document.elementsFromPoint === "function" ? document.elementsFromPoint(x, y) : (() => {
    const hit = document.elementFromPoint(x, y);
    return hit ? [hit] : [];
  })();
  for (const elementCandidate of hitElements) {
    if (!(elementCandidate instanceof HTMLElement)) {
      continue;
    }

    const rowElement = elementCandidate.closest<HTMLElement>(DROP_ROW_SELECTOR);
    if (!rowElement) {
      if (elementCandidate.closest("[data-drop-folder-zone]")) {
        continue;
      }

      const locationElement = elementCandidate.closest<HTMLElement>(LOCATION_SELECTOR);
      const locationId = parseLocationId(locationElement?.dataset.locationId);
      if (locationId !== null && locationElement) {
        return { destination: { locationId, targetType: "location" }, element: locationElement };
      }
      continue;
    }

    const locationId = parseLocationId(rowElement.dataset.locationId);
    if (locationId === null) {
      continue;
    }

    const rect = rowElement.getBoundingClientRect();
    const height = Math.max(1, rect.height);
    const relativeY = Math.max(0, Math.min(height, y - rect.top));
    const ratio = relativeY / height;
    const zone: "top" | "middle" | "bottom" = ratio < 0.25 ? "top" : ratio <= 0.75 ? "middle" : "bottom";

    if (rowElement.dataset.dropDocumentRow === "true") {
      const relPath = rowElement.dataset.documentPath;
      if (!relPath) {
        continue;
      }

      const edge: Edge = zone === "top" ? "top" : "bottom";
      return {
        destination: { locationId, targetType: "document", relPath, [EDGE_KEY]: edge } as DestinationData,
        element: rowElement,
      };
    }

    if (rowElement.dataset.dropFolderRow === "true") {
      const folderPath = rowElement.dataset.folderPath;
      if (!folderPath) {
        continue;
      }

      if (zone === "middle") {
        return { destination: { locationId, targetType: "folder", folderPath }, element: rowElement };
      }

      const edge: Edge = zone === "top" ? "top" : "bottom";
      return {
        destination: { locationId, targetType: "folder", folderPath, [EDGE_KEY]: edge } as DestinationData,
        element: rowElement,
      };
    }

    if (rowElement.dataset.dropLocationRoot === "true") {
      return { destination: { locationId, targetType: "location" }, element: rowElement };
    }
  }

  return null;
}

/**
 * On Tauri/macOS with Retina displays, DragEvent.clientX/Y can report physical
 * pixels while elementsFromPoint expects CSS pixels. Fall back to DPR-scaled
 * coordinates when the direct lookup finds nothing.
 */
export function resolveDestinationFromPointer(x: number, y: number): ResolvedDestination | null {
  const result = resolveDestinationAtPoint(x, y);
  if (result) {
    return result;
  }

  const dpr = window.devicePixelRatio || 1;
  if (dpr > 1) {
    return resolveDestinationAtPoint(x / dpr, y / dpr);
  }

  return null;
}

export function normalizePointerCoordinates(x: number, y: number): { x: number; y: number } {
  return normalizePoint(x, y);
}
