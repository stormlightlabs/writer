import { Toolbar } from "$components/Toolbar";
import { useViewportTier } from "$hooks/useViewportTier";
import { useLayoutSettingsUiState, useToolbarState } from "$state/selectors";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$state/selectors", () => ({ useToolbarState: vi.fn(), useLayoutSettingsUiState: vi.fn() }));
vi.mock("$hooks/useViewportTier", () => ({ useViewportTier: vi.fn() }));

describe("Toolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToolbarState).mockReturnValue({
      isSplitView: false,
      isFocusMode: false,
      isPreviewVisible: false,
      setEditorOnlyMode: vi.fn(),
      toggleSplitView: vi.fn(),
      toggleFocusMode: vi.fn(),
      togglePreviewVisible: vi.fn(),
    });
    vi.mocked(useLayoutSettingsUiState).mockReturnValue({ isOpen: false, setOpen: vi.fn() });
    vi.mocked(useViewportTier).mockReturnValue({
      viewportWidth: 1280,
      tier: "standard",
      isCompact: false,
      isNarrow: false,
      isStandardUp: true,
      isWide: false,
    });
  });

  it("does not render save status when no document is open", () => {
    render(<Toolbar saveStatus="Dirty" hasActiveDocument={false} onSave={vi.fn()} />);

    expect(screen.queryByText("Unsaved")).not.toBeInTheDocument();
  });

  it("renders save status when a document is open", () => {
    render(<Toolbar saveStatus="Dirty" hasActiveDocument onSave={vi.fn()} />);

    expect(screen.getByText("Unsaved")).toBeInTheDocument();
  });

  it("offers an editor-only toggle", () => {
    const setEditorOnlyMode = vi.fn();
    vi.mocked(useToolbarState).mockReturnValue({
      isSplitView: true,
      isFocusMode: false,
      isPreviewVisible: true,
      setEditorOnlyMode,
      toggleSplitView: vi.fn(),
      toggleFocusMode: vi.fn(),
      togglePreviewVisible: vi.fn(),
    });

    render(<Toolbar saveStatus="Idle" onSave={vi.fn()} />);

    fireEvent.click(screen.getByText("Editor"));
    expect(setEditorOnlyMode).toHaveBeenCalledOnce();
  });
});
