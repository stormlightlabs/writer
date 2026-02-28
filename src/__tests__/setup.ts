// oxlint-disable max-classes-per-file
import "@testing-library/jest-dom";
import { vi } from "vitest";

type EventWrapper = { payload: unknown };

type EventHandler = (event: EventWrapper) => void;

const mockListeners = new Map<string, Set<EventHandler>>();

export function emitBackendEvent(event: unknown) {
  const listeners = mockListeners.get("backend-event");
  if (listeners) {
    for (const listener of listeners) {
      listener({ payload: event });
    }
  }
}

export function clearMockListeners() {
  mockListeners.clear();
}

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock(
  "@tauri-apps/plugin-log",
  () => ({
    attachConsole: vi.fn(async () => {}),
    trace: vi.fn(async () => {}),
    debug: vi.fn(async () => {}),
    info: vi.fn(async () => {}),
    warn: vi.fn(async () => {}),
    error: vi.fn(async () => {}),
  }),
);

vi.mock("@tauri-apps/api/event", () => ({
  // oxlint-disable-next-line require-await
  listen: vi.fn(async (eventName: string, handler: EventHandler) => {
    if (!mockListeners.has(eventName)) {
      mockListeners.set(eventName, new Set());
    }
    mockListeners.get(eventName)!.add(handler);

    return () => {
      mockListeners.get(eventName)?.delete(handler);
    };
  }),
}));

vi.mock(
  "@tauri-apps/api/window",
  () => ({ getCurrentWindow: vi.fn(() => ({ onDragDropEvent: vi.fn(() => Promise.resolve(() => {})) })) }),
);

vi.mock("@tauri-apps/plugin-fs", () => ({ readTextFile: vi.fn(() => "") }));

vi.mock(
  "$state/stores/toasts",
  () => ({
    useToastStore: vi.fn(() => ({ toasts: [], addToast: vi.fn(), removeToast: vi.fn(), clearToasts: vi.fn() })),
    showToast: vi.fn(),
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
    showInfoToast: vi.fn(),
    showWarnToast: vi.fn(),
    dismissToast: vi.fn(),
  }),
);

const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const message = String(args[0]);
  if (message.includes("not yet implemented") || message.includes("Unknown command")) {
    return;
  }
  originalWarn.apply(console, args);
};

Object.defineProperty(globalThis, "DOMRect", {
  writable: true,
  value: class DOMRect {
    x = 0;
    y = 0;
    width = 0;
    height = 0;
    top = 0;
    right = 0;
    bottom = 0;
    left = 0;
    constructor(x = 0, y = 0, width = 0, height = 0) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.top = y;
      this.right = x + width;
      this.bottom = y + height;
      this.left = x;
    }
    static fromRect(rect: { x?: number; y?: number; width?: number; height?: number }) {
      return new DOMRect(rect.x, rect.y, rect.width, rect.height);
    }
    toJSON() {
      return {
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
        top: this.top,
        right: this.right,
        bottom: this.bottom,
        left: this.left,
      };
    }
  },
});

if (!globalThis.Range.prototype.getClientRects) {
  Object.defineProperty(globalThis.Range.prototype, "getClientRects", {
    value: () => ({ length: 0, item: () => null, [Symbol.iterator]: function*() {} }),
  });
}

if (!globalThis.Range.prototype.getBoundingClientRect) {
  Object.defineProperty(globalThis.Range.prototype, "getBoundingClientRect", { value: () => new DOMRect() });
}

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, "ResizeObserver", { writable: true, value: ResizeObserverMock });

Object.defineProperty(globalThis, "Selection", {
  writable: true,
  value: class Selection {
    anchorNode: Node | null = null;
    anchorOffset = 0;
    focusNode: Node | null = null;
    focusOffset = 0;
    isCollapsed = true;
    rangeCount = 0;
    type = "None";

    addRange() {}
    collapse() {}
    collapseToEnd() {}
    collapseToStart() {}
    containsNode() {
      return false;
    }
    deleteFromDocument() {}
    empty() {}
    extend() {}
    getRangeAt() {
      return null;
    }
    removeAllRanges() {}
    removeRange() {}
    selectAllChildren() {}
    setBaseAndExtent() {}
    toString() {
      return "";
    }
  },
});

globalThis.getSelection = () => new Selection();

Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
  return new DOMRect(0, 0, 100, 20);
};

globalThis.document.elementFromPoint = () => null;

Element.prototype.scrollTo = function scrollTo() {};
Element.prototype.scrollBy = function scrollBy() {};

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
Object.defineProperty(globalThis, "IntersectionObserver", { writable: true, value: IntersectionObserverMock });

Object.defineProperty(globalThis, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
