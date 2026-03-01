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
  options: { clientX?: number; clientY?: number; altKey?: boolean } = {},
): DragEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperties(event, {
    clientX: { value: options.clientX ?? 0, configurable: true },
    clientY: { value: options.clientY ?? 0, configurable: true },
    x: { value: options.clientX ?? 0, configurable: true },
    y: { value: options.clientY ?? 0, configurable: true },
    altKey: { value: options.altKey ?? false, configurable: true },
    dataTransfer: { value: { effectAllowed: "all", dropEffect: "none", setData: vi.fn() }, configurable: true },
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
  it("prefers direct document hits from elementFromPoint", () => {
    const row = document.createElement("div");
    row.dataset.locationId = "7";
    row.dataset.documentPath = "notes/file.md";
    const child = document.createElement("span");
    row.append(child);
    document.body.append(row);

    vi.spyOn(document, "elementFromPoint").mockReturnValue(child);

    const resolved = resolveDestinationFromPointer(50, 50);
    expect(resolved?.destination.locationId).toBe(7);
    expect(resolved?.destination.targetType).toBe("document");
    expect(resolved?.destination.relPath).toBe("notes/file.md");
  });

  it("falls back to nearest location target when pointer is near but outside rows", () => {
    vi.spyOn(document, "elementFromPoint").mockReturnValue(null);

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

    const resolved = resolveDestinationFromPointer(120, 270);
    expect(resolved?.destination.locationId).toBe(3);
    expect(resolved?.destination.targetType).toBe("location");
  });
});

describe("native drag lifecycle", () => {
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
