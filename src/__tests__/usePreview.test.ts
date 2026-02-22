import { initialPreviewModel, updatePreview, usePreview } from "$hooks/usePreview";
import { invoke } from "@tauri-apps/api/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { beforeEach, vi } from "vitest";

describe("updatePreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts rendering even when doc is not pre-selected", () => {
    const docRef = { location_id: 1, rel_path: "notes.md" };
    const [nextModel, cmd] = updatePreview(initialPreviewModel, { type: "RenderRequested", docRef, text: "# Hello" });

    expect(nextModel.docRef).toStrictEqual(docRef);
    expect(nextModel.isLoading).toBeTruthy();
    expect(nextModel.error).toBeNull();
    expect(cmd.type).toBe("Invoke");
    expect(cmd.type === "Invoke" ? cmd.command : "").toBe("markdown_render");
  });

  it("updates the active doc ref before rendering", () => {
    const [nextModel, cmd] = updatePreview(
      { ...initialPreviewModel, docRef: { location_id: 10, rel_path: "old.md" } },
      { type: "RenderRequested", docRef: { location_id: 11, rel_path: "new.md" }, text: "updated" },
    );

    expect(nextModel.docRef).toStrictEqual({ location_id: 11, rel_path: "new.md" });
    expect(nextModel.isLoading).toBeTruthy();
    expect(cmd.type).toBe("Invoke");
  });

  it("stores render output when backend render succeeds", async () => {
    const invokeMock = vi.mocked(invoke);
    invokeMock.mockResolvedValueOnce({
      type: "ok",
      value: {
        html: "<h1 data-sourcepos='1:1-1:7'>Hello</h1>",
        metadata: { title: "Hello", outline: [], links: [], task_items: { total: 0, completed: 0 }, word_count: 1 },
      },
    });

    const { result } = renderHook(() => usePreview());
    const docRef = { location_id: 1, rel_path: "notes.md" };

    act(() => {
      result.current.render(docRef, "# Hello");
    });

    expect(result.current.model.isLoading).toBeTruthy();

    await waitFor(() => expect(result.current.model.isLoading).toBeFalsy());
    expect(result.current.model.renderResult?.html).toContain("Hello");
    expect(result.current.model.error).toBeNull();
  });
});
