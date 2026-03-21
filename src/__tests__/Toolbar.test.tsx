import { Toolbar } from "$components/Toolbar";
import { useViewportTier } from "$hooks/useViewportTier";
import {
  useLayoutChromeActions,
  useLayoutChromeState,
  useLayoutSettingsUiState,
  useToolbarState,
} from "$state/selectors";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "$state/selectors",
  () => ({
    useToolbarState: vi.fn(),
    useLayoutSettingsUiState: vi.fn(),
    useLayoutChromeActions: vi.fn(),
    useLayoutChromeState: vi.fn(),
  }),
);
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
    vi.mocked(useLayoutChromeActions).mockReturnValue({
      setSidebarCollapsed: vi.fn(),
      toggleSidebarCollapsed: vi.fn(),
      setTopBarsCollapsed: vi.fn(),
      toggleTabBarCollapsed: vi.fn(),
      setStatusBarCollapsed: vi.fn(),
      toggleStatusBarCollapsed: vi.fn(),
      setShowSearch: vi.fn(),
      toggleShowSearch: vi.fn(),
      setFilenameVisibility: vi.fn(),
      toggleFilenameVisibility: vi.fn(),
    });
    vi.mocked(useLayoutSettingsUiState).mockReturnValue({ isOpen: false, setOpen: vi.fn() });
    vi.mocked(useLayoutChromeState).mockReturnValue({
      sidebarCollapsed: false,
      topBarsCollapsed: false,
      statusBarCollapsed: false,
      showSearch: false,
      reduceMotion: false,
      showFilenames: false,
      createReadmeInNewLocations: true,
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

    fireEvent.click(screen.getByRole("button", { name: "View" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Editor" }));
    expect(setEditorOnlyMode).toHaveBeenCalledOnce();
  });

  it("toggles the sidebar from the toolbar next to save", () => {
    const toggleSidebarCollapsed = vi.fn();
    vi.mocked(useLayoutChromeActions).mockReturnValue({
      setSidebarCollapsed: vi.fn(),
      toggleSidebarCollapsed,
      setTopBarsCollapsed: vi.fn(),
      toggleTabBarCollapsed: vi.fn(),
      setStatusBarCollapsed: vi.fn(),
      toggleStatusBarCollapsed: vi.fn(),
      setShowSearch: vi.fn(),
      toggleShowSearch: vi.fn(),
      setFilenameVisibility: vi.fn(),
      toggleFilenameVisibility: vi.fn(),
    });

    render(<Toolbar saveStatus="Idle" onSave={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Hide Sidebar" }));
    expect(toggleSidebarCollapsed).toHaveBeenCalledOnce();
  });

  it("opens the AT Protocol auth entry from the toolbar", () => {
    const onAtProtoAuth = vi.fn();

    render(<Toolbar saveStatus="Idle" onSave={vi.fn()} onAtProtoAuth={onAtProtoAuth} />);

    fireEvent.click(screen.getByRole("button", { name: "Tools" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Login to AT Proto" }));
    expect(onAtProtoAuth).toHaveBeenCalledOnce();
  });

  it("opens and closes the view dropdown from the toolbar trigger", async () => {
    render(<Toolbar saveStatus="Idle" onSave={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "View" });

    fireEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.click(trigger);
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("does not render non-functional formatting buttons", () => {
    render(<Toolbar saveStatus="Idle" onSave={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Bold" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Italic" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Link" })).not.toBeInTheDocument();
  });
});
