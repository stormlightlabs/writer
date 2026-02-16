/**
 * Vitest test setup file
 */

import "@testing-library/jest-dom";
import { vi } from "vitest";

type EventWrapper = { payload: unknown };

type EventHandler = (event: EventWrapper) => void;

const mockListeners: Map<string, Set<EventHandler>> = new Map();

export function emitBackendEvent(event: unknown) {
  const listeners = mockListeners.get("backend-event");
  if (listeners) {
    listeners.forEach((listener) => listener({ payload: event }));
  }
}

export function clearMockListeners() {
  mockListeners.clear();
}

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

vi.mock("@tauri-apps/api/event", () => ({
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

const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const message = String(args[0]);
  if (message.includes("not yet implemented") || message.includes("Unknown command")) {
    return;
  }
  originalWarn.apply(console, args);
};
