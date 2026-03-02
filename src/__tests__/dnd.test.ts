import {
  announce,
  attachClosestEdge,
  cleanup,
  draggable,
  dropTargetForElements,
  extractClosestEdge,
  monitorForElements,
  normalizePointerCoordinates,
  resolveDestinationFromPointer,
} from "$dnd";
import { afterEach, describe, expect, it, vi } from "vitest";

function withDragEvent(
  type: string,
  options: { clientX?: number; clientY?: number; altKey?: boolean; dropEffect?: "none" | "move" | "copy" } = {},
): DragEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperties(event, {
    clientX: { value: options.clientX ?? 0, configurable: true },
    clientY: { value: options.clientY ?? 0, configurable: true },
    x: { value: options.clientX ?? 0, configurable: true },
    y: { value: options.clientY ?? 0, configurable: true },
    altKey: { value: options.altKey ?? false, configurable: true },
    dataTransfer: {
      value: {
        effectAllowed: "all",
        dropEffect: options.dropEffect ?? "none",
        setData: vi.fn(),
        setDragImage: vi.fn(),
      },
      configurable: true,
    },
  });
  return event;
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("dnd edge helpers", () => {
  it("attaches and extracts a top edge", () => {
    const element = document.createElement("div");
    element.getBoundingClientRect = () =>
      ({
        left: 0,
        right: 100,
        top: 100,
        bottom: 200,
        width: 100,
        height: 100,
        x: 0,
        y: 100,
        toJSON: () => ({}),
      }) as DOMRect;

    const destination = attachClosestEdge({ locationId: 1, targetType: "document", relPath: "a.md" }, {
      input: { clientX: 12, clientY: 110, x: 12, y: 110, altKey: false },
      element,
      allowedEdges: ["top", "bottom"],
    });

    expect(extractClosestEdge(destination)).toBe("top");
  });
});

describe("resolveDestinationFromPointer", () => {
  it("resolves document rows using zone hit testing", () => {
    const row = document.createElement("div");
    row.dataset.dropDocumentRow = "true";
    row.dataset.locationId = "7";
    row.dataset.documentPath = "notes/file.md";
    row.getBoundingClientRect = () =>
      ({
        left: 0,
        right: 400,
        top: 100,
        bottom: 140,
        width: 400,
        height: 40,
        x: 0,
        y: 100,
        toJSON: () => ({}),
      }) as DOMRect;
    const child = document.createElement("span");
    row.append(child);
    document.body.append(row);

    vi.spyOn(document, "elementFromPoint").mockReturnValue(child);

    const resolved = resolveDestinationFromPointer(50, 105);
    expect(resolved?.destination.locationId).toBe(7);
    expect(resolved?.destination.targetType).toBe("document");
    expect(resolved?.destination.relPath).toBe("notes/file.md");
    expect(extractClosestEdge(resolved?.destination)).toBe("top");
  });

  it("returns null when the pointer is outside all drop rows", () => {
    vi.spyOn(document, "elementFromPoint").mockReturnValue(null);

    const resolved = resolveDestinationFromPointer(120, 270);
    expect(resolved).toBeNull();
  });

  it("falls back to the location container when not over a row target", () => {
    const locationContainer = document.createElement("div");
    locationContainer.dataset.locationId = "8";
    const headerButton = document.createElement("button");
    locationContainer.append(headerButton);
    document.body.append(locationContainer);

    vi.spyOn(document, "elementFromPoint").mockReturnValue(headerButton);

    const resolved = resolveDestinationFromPointer(16, 24);
    expect(resolved?.destination.locationId).toBe(8);
    expect(resolved?.destination.targetType).toBe("location");
  });

  it("uses middle folder zone as drop-into", () => {
    const row = document.createElement("div");
    row.dataset.dropFolderRow = "true";
    row.dataset.locationId = "3";
    row.dataset.folderPath = "archive";
    row.getBoundingClientRect = () =>
      ({
        left: 0,
        right: 400,
        top: 220,
        bottom: 260,
        width: 400,
        height: 40,
        x: 0,
        y: 220,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.append(row);
    vi.spyOn(document, "elementFromPoint").mockReturnValue(row);

    const resolved = resolveDestinationFromPointer(120, 240);
    expect(resolved?.destination.locationId).toBe(3);
    expect(resolved?.destination.targetType).toBe("folder");
    expect(resolved?.destination.folderPath).toBe("archive");
    expect(extractClosestEdge(resolved?.destination)).toBeNull();
  });

  it("uses top folder zone as between-items insertion", () => {
    const folderRow = document.createElement("div");
    folderRow.dataset.dropFolderRow = "true";
    folderRow.dataset.locationId = "4";
    folderRow.dataset.folderPath = "projects/writer";
    folderRow.getBoundingClientRect = () =>
      ({
        left: 0,
        right: 400,
        top: 300,
        bottom: 340,
        width: 400,
        height: 40,
        x: 0,
        y: 300,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.append(folderRow);
    vi.spyOn(document, "elementFromPoint").mockReturnValue(folderRow);

    const resolved = resolveDestinationFromPointer(100, 304);
    expect(resolved?.destination.locationId).toBe(4);
    expect(resolved?.destination.targetType).toBe("folder");
    expect(resolved?.destination.folderPath).toBe("projects/writer");
    expect(extractClosestEdge(resolved?.destination)).toBe("top");
  });
});

describe("native drag lifecycle", () => {
  it("uses normalized viewport coordinates from drag events", () => {
    Object.defineProperty(globalThis, "innerWidth", { value: 500, configurable: true });
    Object.defineProperty(globalThis, "innerHeight", { value: 500, configurable: true });
    Object.defineProperty(globalThis, "devicePixelRatio", { value: 2, configurable: true });

    const sourceElement = document.createElement("div");
    const dropZoneElement = document.createElement("div");
    document.body.append(sourceElement, dropZoneElement);

    let receivedInput: { clientX: number; clientY: number; x: number; y: number; altKey: boolean } | null = null;

    const stopDraggable = draggable({
      element: sourceElement,
      getInitialData: () => ({ type: "document", locationId: 1, relPath: "a.md", title: "A" }),
    });
    const stopDropTarget = dropTargetForElements({
      element: dropZoneElement,
      canDrop: () => true,
      getData: ({ input }) => {
        receivedInput = input;
        return { locationId: 9, targetType: "location" };
      },
    });

    sourceElement.dispatchEvent(withDragEvent("dragstart", { clientX: 100, clientY: 100 }));
    dropZoneElement.dispatchEvent(withDragEvent("dragover", { clientX: 100, clientY: 100 }));

    expect(receivedInput).toEqual({ clientX: 100, clientY: 100, x: 100, y: 100, altKey: false });

    stopDropTarget();
    stopDraggable();
  });

  it("ignores dragleave events when pointer is still inside the drop target bounds", () => {
    const sourceElement = document.createElement("div");
    const dropZoneElement = document.createElement("div");
    dropZoneElement.getBoundingClientRect = () =>
      ({
        left: 0,
        right: 300,
        top: 0,
        bottom: 300,
        width: 300,
        height: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.append(sourceElement, dropZoneElement);

    const onDropTargetChange = vi.fn();

    const stopDraggable = draggable({
      element: sourceElement,
      getInitialData: () => ({ type: "document", locationId: 1, relPath: "a.md", title: "A" }),
    });
    const stopDropTarget = dropTargetForElements({
      element: dropZoneElement,
      canDrop: () => true,
      getData: () => ({ locationId: 2, targetType: "location" }),
    });
    const stopMonitor = monitorForElements({ onDropTargetChange });

    sourceElement.dispatchEvent(withDragEvent("dragstart", { clientX: 24, clientY: 40 }));
    dropZoneElement.dispatchEvent(withDragEvent("dragover", { clientX: 24, clientY: 40 }));
    dropZoneElement.dispatchEvent(withDragEvent("dragleave", { clientX: 24, clientY: 40 }));

    expect(onDropTargetChange).toHaveBeenCalledTimes(1);

    stopMonitor();
    stopDropTarget();
    stopDraggable();
  });

  it("sets a compact custom drag image on dragstart", () => {
    const sourceElement = document.createElement("div");
    const ghostElement = document.createElement("div");
    ghostElement.id = "sidebar-drag-ghost";
    ghostElement.className = "sidebar-drag-ghost";
    document.body.append(sourceElement, ghostElement);

    const stopDraggable = draggable({
      element: sourceElement,
      getInitialData: () => ({ type: "document", locationId: 1, relPath: "notes/a.md", title: "A" }),
    });

    const dragEvent = withDragEvent("dragstart", { clientX: 12, clientY: 20 });
    sourceElement.dispatchEvent(dragEvent);

    expect(dragEvent.dataTransfer?.setDragImage).toHaveBeenCalledTimes(1);
    expect(dragEvent.dataTransfer?.setDragImage).toHaveBeenCalledWith(ghostElement, 12, 12);

    stopDraggable();
  });

  it("monitors drag start, target change, and drop", () => {
    const sourceElement = document.createElement("div");
    const dropZoneElement = document.createElement("div");
    document.body.append(sourceElement, dropZoneElement);

    const onDropTargetChange = vi.fn();
    const onDrop = vi.fn();

    const stopDraggable = draggable({
      element: sourceElement,
      getInitialData: () => ({ type: "document", locationId: 1, relPath: "a.md", title: "A" }),
    });
    const stopDropTarget = dropTargetForElements({
      element: dropZoneElement,
      canDrop: () => true,
      getData: () => ({ locationId: 2, targetType: "location" }),
    });
    const stopMonitor = monitorForElements({ onDropTargetChange, onDrop });

    sourceElement.dispatchEvent(withDragEvent("dragstart", { clientX: 12, clientY: 20 }));
    dropZoneElement.dispatchEvent(withDragEvent("dragover", { clientX: 24, clientY: 40 }));
    dropZoneElement.dispatchEvent(withDragEvent("drop", { clientX: 24, clientY: 40 }));

    expect(onDropTargetChange).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop.mock.calls[0][0].location.current.dropTargets[0].data).toEqual({
      locationId: 2,
      targetType: "location",
    });

    stopMonitor();
    stopDropTarget();
    stopDraggable();
  });

  it("does not dispatch monitor onDrop when drag is cancelled", () => {
    const sourceElement = document.createElement("div");
    document.body.append(sourceElement);

    const onDrop = vi.fn();
    const sourceOnDrop = vi.fn();

    const stopDraggable = draggable({
      element: sourceElement,
      getInitialData: () => ({ type: "document", locationId: 1, relPath: "a.md", title: "A" }),
      onDrop: sourceOnDrop,
    });
    const stopMonitor = monitorForElements({ onDrop });

    sourceElement.dispatchEvent(withDragEvent("dragstart", { clientX: 12, clientY: 20 }));
    sourceElement.dispatchEvent(withDragEvent("dragend", { clientX: 40, clientY: 50, dropEffect: "none" }));

    expect(onDrop).not.toHaveBeenCalled();
    expect(sourceOnDrop).toHaveBeenCalledTimes(1);

    stopMonitor();
    stopDraggable();
  });
});

describe("normalizePointerCoordinates", () => {
  it("normalizes physical pixel coordinates to viewport coordinates when needed", () => {
    Object.defineProperty(globalThis, "innerWidth", { value: 600, configurable: true });
    Object.defineProperty(globalThis, "innerHeight", { value: 400, configurable: true });
    Object.defineProperty(globalThis, "devicePixelRatio", { value: 2, configurable: true });

    const point = normalizePointerCoordinates(1000, 500);
    expect(point).toEqual({ x: 500, y: 250 });
  });
});

describe("announce", () => {
  it("creates a live region for screen reader updates", () => {
    announce("Dragging file");
    expect(document.querySelector("#writer-dnd-live-region")).toBeTruthy();
  });
});
