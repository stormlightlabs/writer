import { useDocumentActions } from "$hooks/useDocumentActions";
import type { DocRef } from "$types";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("useDocumentActions", () => {
  it("ignores non-numeric locationId values when creating a new document", () => {
    const dispatchEditor = vi.fn();
    const createNewDocument = vi.fn((): DocRef => ({ location_id: 1, rel_path: "untitled_2026_02_27.md" }));

    const { result } = renderHook(() =>
      useDocumentActions({
        editorDocRef: null,
        selectedLocationId: 1,
        documents: [],
        tabs: [],
        dispatchEditor,
        createDraftTab: vi.fn(),
        createNewDocument,
      })
    );

    act(() => {
      result.current.handleNewDocument({ type: "click" } as unknown as number);
    });

    expect(createNewDocument).toHaveBeenCalledWith(undefined);
    expect(dispatchEditor).toHaveBeenCalledWith({
      type: "NewDraftCreated",
      docRef: { location_id: 1, rel_path: "untitled_2026_02_27.md" },
    });
  });
});
