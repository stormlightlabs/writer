import { useDocumentSessionEffects } from "$hooks/app/useDocumentSessionEffects";
import type { DocRef, LocationDescriptor } from "$types";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

type UseDocumentSessionEffectsArgs = Parameters<typeof useDocumentSessionEffects>[0];

const LOCATION: LocationDescriptor = { id: 1, name: "Workspace", root_path: "/workspace", added_at: "2024-01-01" };

const createArgs = (overrides: Partial<UseDocumentSessionEffectsArgs> = {}): UseDocumentSessionEffectsArgs => ({
  isSidebarLoading: false,
  isSessionHydrated: true,
  locations: [LOCATION],
  selectedLocationId: LOCATION.id,
  tabs: [],
  activeTab: null,
  documentsCount: 0,
  activeDocRef: null,
  openDoc: vi.fn(),
  handleSelectDocument: vi.fn(),
  handleNewDocument: vi.fn(),
  ...overrides,
});

describe("useDocumentSessionEffects", () => {
  it("waits for session hydration before creating a startup draft", () => {
    const handleNewDocument = vi.fn();
    renderHook(() => useDocumentSessionEffects(createArgs({ isSessionHydrated: false, handleNewDocument })));
    expect(handleNewDocument).not.toHaveBeenCalled();
  });

  it("creates a new draft on startup when no tabs are restored", () => {
    const handleNewDocument = vi.fn();
    renderHook(() => useDocumentSessionEffects(createArgs({ handleNewDocument })));
    expect(handleNewDocument).toHaveBeenCalled();
    expect(handleNewDocument).toHaveBeenCalledWith(LOCATION.id);
  });

  it("opens the active document when one is selected", () => {
    const openDoc = vi.fn();
    const activeDocRef: DocRef = { location_id: LOCATION.id, rel_path: "notes/today.md" };

    renderHook(() =>
      useDocumentSessionEffects(
        createArgs({
          tabs: [{ id: "tab-1", docRef: activeDocRef, title: "Today", isModified: false }],
          activeTab: { id: "tab-1", docRef: activeDocRef, title: "Today", isModified: false },
          activeDocRef,
          openDoc,
        }),
      )
    );

    expect(openDoc).toHaveBeenCalledWith(activeDocRef);
  });
});
