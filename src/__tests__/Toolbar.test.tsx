import { Toolbar } from "$components/Toolbar";
import { useViewportTier } from "$hooks/useViewportTier";
import { useToolbarState } from "$state/panel-selectors";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$state/panel-selectors", () => ({ useToolbarState: vi.fn() }));

vi.mock("$hooks/useViewportTier", () => ({ useViewportTier: vi.fn() }));

describe("Toolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToolbarState).mockReturnValue({
      isSplitView: false,
      isFocusMode: false,
      isPreviewVisible: true,
      toggleSplitView: vi.fn(),
      toggleFocusMode: vi.fn(),
      togglePreviewVisible: vi.fn(),
    });
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
    render(<Toolbar saveStatus="Dirty" hasActiveDocument={false} onSave={vi.fn()} onOpenSettings={vi.fn()} />);

    expect(screen.queryByText("Unsaved")).not.toBeInTheDocument();
  });

  it("renders save status when a document is open", () => {
    render(<Toolbar saveStatus="Dirty" hasActiveDocument onSave={vi.fn()} onOpenSettings={vi.fn()} />);

    expect(screen.getByText("Unsaved")).toBeInTheDocument();
  });
});
