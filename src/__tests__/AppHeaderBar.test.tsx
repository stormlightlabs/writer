import { AppHeaderBar } from "$components/AppLayout/AppHeaderBar";
import { useAppHeaderBarState, useHelpSheetState, useLayoutSettingsUiState } from "$state/selectors";
import { formatShortcut } from "$utils/shortcuts";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "$state/selectors",
  () => ({ useAppHeaderBarState: vi.fn(), useHelpSheetState: vi.fn(), useLayoutSettingsUiState: vi.fn() }),
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
    vi.mocked(useLayoutSettingsUiState).mockReturnValue({ isOpen: false, setOpen: vi.fn() });
  });

  it("opens the help sheet from the header action", () => {
    const setHelpSheetOpen = vi.fn();
    vi.mocked(useHelpSheetState).mockReturnValue({ isOpen: false, setOpen: setHelpSheetOpen, toggle: vi.fn() });

    render(<AppHeaderBar />);
    fireEvent.click(screen.getByTitle(`Open help sheet (${formatShortcut("Cmd+/")})`));

    expect(setHelpSheetOpen).toHaveBeenCalledWith(true);
  });

  it("opens the search palette from the header search trigger", () => {
    const setShowSearch = vi.fn();
    vi.mocked(useAppHeaderBarState).mockReturnValue({
      sidebarCollapsed: false,
      tabBarCollapsed: false,
      statusBarCollapsed: false,
      toggleSidebarCollapsed: vi.fn(),
      toggleTabBarCollapsed: vi.fn(),
      toggleStatusBarCollapsed: vi.fn(),
      setShowSearch,
    });

    render(<AppHeaderBar />);
    fireEvent.click(screen.getByTitle(`Search (${formatShortcut("Cmd+Shift+F")})`));

    expect(setShowSearch).toHaveBeenCalledWith(true);
  });

  it("does not render text menus in the header", () => {
    render(<AppHeaderBar />);

    expect(screen.queryByRole("button", { name: "File" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Format" })).not.toBeInTheDocument();
  });
});
