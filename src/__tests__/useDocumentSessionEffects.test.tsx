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
  ...overrides,
});

describe("useDocumentSessionEffects", () => {
  it("waits for session hydration before showing the empty workspace state", () => {
    const handleSelectDocument = vi.fn();
    renderHook(() => useDocumentSessionEffects(createArgs({ isSessionHydrated: false, handleSelectDocument })));
    expect(handleSelectDocument).not.toHaveBeenCalled();
  });

  it("does not create a startup draft when no tabs are restored", () => {
    const handleSelectDocument = vi.fn();
    renderHook(() => useDocumentSessionEffects(createArgs({ handleSelectDocument })));
    expect(handleSelectDocument).not.toHaveBeenCalled();
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

  it("does not reopen when active doc ref identity changes but points to same file", () => {
    const openDoc = vi.fn();
    const activeDocRef: DocRef = { location_id: LOCATION.id, rel_path: "notes/today.md" };

    const { rerender } = renderHook((args: UseDocumentSessionEffectsArgs) => useDocumentSessionEffects(args), {
      initialProps: createArgs({
        tabs: [{ id: "tab-1", docRef: activeDocRef, title: "Today", isModified: false }],
        activeTab: { id: "tab-1", docRef: activeDocRef, title: "Today", isModified: false },
        activeDocRef,
        openDoc,
      }),
    });

    rerender(
      createArgs({
        tabs: [{
          id: "tab-1",
          docRef: { location_id: LOCATION.id, rel_path: "notes/today.md" },
          title: "Today",
          isModified: true,
        }],
        activeTab: {
          id: "tab-1",
          docRef: { location_id: LOCATION.id, rel_path: "notes/today.md" },
          title: "Today",
          isModified: true,
        },
        activeDocRef: { location_id: LOCATION.id, rel_path: "notes/today.md" },
        openDoc,
      }),
    );

    expect(openDoc).toHaveBeenCalledTimes(1);
  });

  it("reselects an existing tab for an empty selected location instead of creating a draft", () => {
    const handleSelectDocument = vi.fn();
    const otherDocRef: DocRef = { location_id: LOCATION.id, rel_path: "notes/archive.md" };

    renderHook(() =>
      useDocumentSessionEffects(
        createArgs({
          documentsCount: 0,
          activeTab: null,
          tabs: [{ id: "tab-1", docRef: otherDocRef, title: "Archive", isModified: false }],
          handleSelectDocument,
        }),
      )
    );

    expect(handleSelectDocument).toHaveBeenCalledWith(LOCATION.id, "notes/archive.md");
  });
});
