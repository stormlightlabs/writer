export type Edge = "top" | "bottom";

type DragInput = { clientX: number; clientY: number; x: number; y: number; altKey: boolean };

type DragSource = { data: unknown; element: HTMLElement };

type DropTarget = { element: HTMLElement; data: unknown };

type DragLocation = { dropTargets: DropTarget[]; input: DragInput };

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

function normalizePoint(rawX: number, rawY: number): { x: number; y: number } {
  const dpr = window.devicePixelRatio || 1;
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

export function attachClosestEdge<T extends object>(
  data: T,
  options: { input: DragInput; element: HTMLElement; allowedEdges: Edge[] },
): T & { [EDGE_KEY]?: Edge } {
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

function toDestinationDataFromElement(element: HTMLElement): DestinationData | null {
  const locationId = parseLocationId(element.dataset.locationId);
  if (locationId === null) {
    return null;
  }

  if (element.dataset.documentPath) {
    return { locationId, relPath: element.dataset.documentPath, targetType: "document" };
  }

  if (element.dataset.folderPath) {
    return { locationId, folderPath: element.dataset.folderPath, targetType: "folder" };
  }

  return { locationId, targetType: "location" };
}

function destinationPriority(destination: DestinationData): number {
  if (destination.targetType === "document") {
    return 3;
  }

  if (destination.targetType === "folder" || destination.folderPath) {
    return 2;
  }

  return 1;
}

export function resolveDestinationFromPointer(
  x: number,
  y: number,
): { destination: DestinationData; element: HTMLElement } | null {
  const hitElement = document.elementFromPoint(x, y);
  const locationElement = hitElement instanceof HTMLElement
    ? hitElement.closest<HTMLElement>("[data-location-id]")
    : null;
  if (locationElement) {
    const destination = toDestinationDataFromElement(locationElement);
    if (destination) {
      return { destination, element: locationElement };
    }
  }

  const allTargets = document.querySelectorAll<HTMLElement>(
    "[data-drop-folder-row][data-location-id], [data-drop-document-row][data-location-id], [data-drop-location-root][data-location-id]",
  );

  let best: { destination: DestinationData; element: HTMLElement; priority: number; area: number } | null = null;

  for (const element of allTargets) {
    const rect = element.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      continue;
    }

    const destination = toDestinationDataFromElement(element);
    if (!destination) {
      continue;
    }

    const priority = destinationPriority(destination);
    const area = Math.max(1, rect.width * rect.height);

    if (!best || priority > best.priority || (priority === best.priority && area < best.area)) {
      best = { destination, element, priority, area };
    }
  }

  if (!best) {
    let nearestDistance = Infinity;
    let nearest: { destination: DestinationData; element: HTMLElement } | null = null;

    for (const element of allTargets) {
      const rect = element.getBoundingClientRect();
      if (x < rect.left || x > rect.right) {
        continue;
      }

      const destination = toDestinationDataFromElement(element);
      if (!destination) {
        continue;
      }

      const distance = y < rect.top ? rect.top - y : (y > rect.bottom ? y - rect.bottom : 0);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = { destination: { locationId: destination.locationId, targetType: "location" }, element };
      }
    }

    if (nearest && nearestDistance < 64) {
      return nearest;
    }

    return null;
  }

  return { destination: best.destination, element: best.element };
}

export function normalizePointerCoordinates(x: number, y: number): { x: number; y: number } {
  return normalizePoint(x, y);
}
