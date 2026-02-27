import { AppHeaderBar } from "$components/layout/AppHeaderBar";
import { useViewportTier } from "$hooks/useViewportTier";
import { useAppHeaderBarState, useHelpSheetState, useStyleDiagnosticsUiState } from "$state/selectors";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$hooks/useViewportTier", () => ({ useViewportTier: vi.fn() }));
vi.mock(
  "$state/selectors",
  () => ({ useAppHeaderBarState: vi.fn(), useHelpSheetState: vi.fn(), useStyleDiagnosticsUiState: vi.fn() }),
);

describe("AppHeaderBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAppHeaderBarState).mockReturnValue({
      sidebarCollapsed: false,
      tabBarCollapsed: false,
      statusBarCollapsed: false,
      toggleSidebarCollapsed: vi.fn(),
      toggleTabBarCollapsed: vi.fn(),
      toggleStatusBarCollapsed: vi.fn(),
      setShowSearch: vi.fn(),
    });
    vi.mocked(useHelpSheetState).mockReturnValue({ isOpen: false, setOpen: vi.fn(), toggle: vi.fn() });
    vi.mocked(useStyleDiagnosticsUiState).mockReturnValue({ isOpen: false, setOpen: vi.fn(), toggle: vi.fn() });
    vi.mocked(useViewportTier).mockReturnValue({
      viewportWidth: 1280,
      tier: "standard",
      isCompact: false,
      isNarrow: false,
      isStandardUp: true,
      isWide: false,
    });
  });

  it("opens the help sheet from the header action", () => {
    const setHelpSheetOpen = vi.fn();
    vi.mocked(useHelpSheetState).mockReturnValue({ isOpen: false, setOpen: setHelpSheetOpen, toggle: vi.fn() });

    render(<AppHeaderBar />);
    fireEvent.click(screen.getByTitle("Open help sheet (Cmd+/)"));

    expect(setHelpSheetOpen).toHaveBeenCalledWith(true);
  });

  it("toggles style diagnostics from the header action", () => {
    const toggleStyleDiagnostics = vi.fn();
    vi.mocked(useStyleDiagnosticsUiState).mockReturnValue({
      isOpen: false,
      setOpen: vi.fn(),
      toggle: toggleStyleDiagnostics,
    });

    render(<AppHeaderBar />);
    fireEvent.click(screen.getByTitle("Show style diagnostics"));

    expect(toggleStyleDiagnostics).toHaveBeenCalledOnce();
  });
});
