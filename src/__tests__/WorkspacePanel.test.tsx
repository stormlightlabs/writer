/* oxlint-disable eslint-plugin-react-perf/jsx-no-new-object-as-prop */
import { WorkspacePanel } from "$components/layout/WorkspacePanel";
import {
  useEditorPresentationState,
  useSidebarState,
  useToolbarState,
  useWorkspacePanelModeState,
  useWorkspacePanelSidebarState,
  useWorkspacePanelStatusBarCollapsed,
  useWorkspacePanelTopBarsCollapsed,
} from "$state/panel-selectors";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "$state/panel-selectors",
  () => ({
    useSidebarState: vi.fn(),
    useToolbarState: vi.fn(),
    useEditorPresentationState: vi.fn(),
    useWorkspacePanelSidebarState: vi.fn(),
    useWorkspacePanelModeState: vi.fn(),
    useWorkspacePanelTopBarsCollapsed: vi.fn(),
    useWorkspacePanelStatusBarCollapsed: vi.fn(),
  }),
);

describe("WorkspacePanel", () => {
  it("renders preview-only mode when preview is enabled without split view", () => {
    vi.mocked(useSidebarState).mockReturnValue({
      locations: [],
      selectedLocationId: undefined,
      selectedDocPath: undefined,
      documents: [],
      isLoading: false,
      filterText: "",
      setFilterText: vi.fn(),
      selectLocation: vi.fn(),
      toggleSidebarCollapsed: vi.fn(),
    });
    vi.mocked(useToolbarState).mockReturnValue({
      isSplitView: false,
      isFocusMode: false,
      isPreviewVisible: true,
      toggleSplitView: vi.fn(),
      toggleFocusMode: vi.fn(),
      togglePreviewVisible: vi.fn(),
    });
    vi.mocked(useEditorPresentationState).mockReturnValue({
      theme: "dark",
      showLineNumbers: true,
      textWrappingEnabled: true,
      syntaxHighlightingEnabled: true,
      fontSize: 16,
      fontFamily: "IBM Plex Mono",
      typewriterScrollingEnabled: false,
      focusDimmingMode: "off",
      posHighlightingEnabled: false,
      styleCheckSettings: {
        enabled: false,
        categories: { filler: true, redundancy: true, cliche: true },
        customPatterns: [],
      },
    });
    vi.mocked(useWorkspacePanelSidebarState).mockReturnValue({ sidebarCollapsed: true });
    vi.mocked(useWorkspacePanelModeState).mockReturnValue({ isSplitView: false, isPreviewVisible: true });
    vi.mocked(useWorkspacePanelTopBarsCollapsed).mockReturnValue(true);
    vi.mocked(useWorkspacePanelStatusBarCollapsed).mockReturnValue(true);
    const sidebar = { handleAddLocation: vi.fn(), handleRemoveLocation: vi.fn(), handleSelectDocument: vi.fn() };
    const toolbar = { saveStatus: "Idle" as const, onSave: vi.fn(), onOpenSettings: vi.fn() };
    const tabs = {
      tabs: [],
      activeTabId: null,
      handleSelectTab: vi.fn(),
      handleCloseTab: vi.fn(),
      handleReorderTabs: vi.fn(),
    };
    const editor = {
      initialText: "# Hidden",
      onChange: vi.fn(),
      onSave: vi.fn(),
      onCursorMove: vi.fn(),
      onSelectionChange: vi.fn(),
    };
    const preview = {
      renderResult: {
        html: "<p>Preview content</p>",
        metadata: { title: null, outline: [], links: [], task_items: { total: 0, completed: 0 }, word_count: 2 },
      },
      theme: "dark" as const,
      editorLine: 1,
      onScrollToLine: vi.fn(),
    };
    const statusBar = { stats: { cursorLine: 1, cursorColumn: 1, wordCount: 0, charCount: 0 } };

    const { container } = render(
      <WorkspacePanel
        sidebar={sidebar}
        toolbar={toolbar}
        tabs={tabs}
        editor={editor}
        preview={preview}
        statusBar={statusBar} />,
    );

    expect(screen.getByText("Preview content")).toBeInTheDocument();
    expect(container.querySelector("[data-testid='editor-container']")).not.toBeInTheDocument();
  });

  it("renders sidebar controls and supports resizing", () => {
    const onToggleSidebar = vi.fn();
    vi.mocked(useSidebarState).mockReturnValue({
      locations: [],
      selectedLocationId: undefined,
      selectedDocPath: undefined,
      documents: [],
      isLoading: false,
      filterText: "",
      setFilterText: vi.fn(),
      selectLocation: vi.fn(),
      toggleSidebarCollapsed: onToggleSidebar,
    });
    vi.mocked(useToolbarState).mockReturnValue({
      isSplitView: false,
      isFocusMode: false,
      isPreviewVisible: false,
      toggleSplitView: vi.fn(),
      toggleFocusMode: vi.fn(),
      togglePreviewVisible: vi.fn(),
    });
    vi.mocked(useEditorPresentationState).mockReturnValue({
      theme: "dark",
      showLineNumbers: true,
      textWrappingEnabled: true,
      syntaxHighlightingEnabled: true,
      fontSize: 16,
      fontFamily: "IBM Plex Mono",
      typewriterScrollingEnabled: false,
      focusDimmingMode: "off",
      posHighlightingEnabled: false,
      styleCheckSettings: {
        enabled: false,
        categories: { filler: true, redundancy: true, cliche: true },
        customPatterns: [],
      },
    });
    vi.mocked(useWorkspacePanelSidebarState).mockReturnValue({ sidebarCollapsed: false });
    vi.mocked(useWorkspacePanelModeState).mockReturnValue({ isSplitView: false, isPreviewVisible: false });
    vi.mocked(useWorkspacePanelTopBarsCollapsed).mockReturnValue(true);
    vi.mocked(useWorkspacePanelStatusBarCollapsed).mockReturnValue(true);
    const sidebar = { handleAddLocation: vi.fn(), handleRemoveLocation: vi.fn(), handleSelectDocument: vi.fn() };
    const toolbar = { saveStatus: "Idle" as const, onSave: vi.fn(), onOpenSettings: vi.fn() };
    const tabs = {
      tabs: [],
      activeTabId: null,
      handleSelectTab: vi.fn(),
      handleCloseTab: vi.fn(),
      handleReorderTabs: vi.fn(),
    };
    const editor = {
      initialText: "# Visible",
      onChange: vi.fn(),
      onSave: vi.fn(),
      onCursorMove: vi.fn(),
      onSelectionChange: vi.fn(),
    };
    const preview = {
      renderResult: {
        html: "<p>Preview content</p>",
        metadata: { title: null, outline: [], links: [], task_items: { total: 0, completed: 0 }, word_count: 2 },
      },
      theme: "dark" as const,
      editorLine: 1,
      onScrollToLine: vi.fn(),
    };
    const statusBar = { stats: { cursorLine: 1, cursorColumn: 1, wordCount: 0, charCount: 0 } };

    render(
      <WorkspacePanel
        sidebar={sidebar}
        toolbar={toolbar}
        tabs={tabs}
        editor={editor}
        preview={preview}
        statusBar={statusBar} />,
    );

    fireEvent.click(screen.getByTitle("Hide sidebar (Ctrl+B)"));
    expect(onToggleSidebar).toHaveBeenCalledOnce();

    const separator = screen.getByRole("separator", { name: "Resize sidebar" });
    const sidebarContainer = separator.parentElement as HTMLElement;
    const appWindow = globalThis as unknown as Window;
    expect(sidebarContainer).toHaveStyle({ width: "280px" });

    fireEvent.pointerDown(separator, { clientX: 280 });
    fireEvent.pointerMove(appWindow, { clientX: 360 });
    fireEvent.pointerUp(appWindow);

    expect(sidebarContainer).toHaveStyle({ width: "360px" });
  });

  it("renders split mode and supports resizing between editor and preview", () => {
    vi.mocked(useSidebarState).mockReturnValue({
      locations: [],
      selectedLocationId: undefined,
      selectedDocPath: undefined,
      documents: [],
      isLoading: false,
      filterText: "",
      setFilterText: vi.fn(),
      selectLocation: vi.fn(),
      toggleSidebarCollapsed: vi.fn(),
    });
    vi.mocked(useToolbarState).mockReturnValue({
      isSplitView: true,
      isFocusMode: false,
      isPreviewVisible: true,
      toggleSplitView: vi.fn(),
      toggleFocusMode: vi.fn(),
      togglePreviewVisible: vi.fn(),
    });
    vi.mocked(useEditorPresentationState).mockReturnValue({
      theme: "dark",
      showLineNumbers: true,
      textWrappingEnabled: true,
      syntaxHighlightingEnabled: true,
      fontSize: 16,
      fontFamily: "IBM Plex Mono",
      typewriterScrollingEnabled: false,
      focusDimmingMode: "off",
      posHighlightingEnabled: false,
      styleCheckSettings: {
        enabled: false,
        categories: { filler: true, redundancy: true, cliche: true },
        customPatterns: [],
      },
    });
    vi.mocked(useWorkspacePanelSidebarState).mockReturnValue({ sidebarCollapsed: true });
    vi.mocked(useWorkspacePanelModeState).mockReturnValue({ isSplitView: true, isPreviewVisible: true });
    vi.mocked(useWorkspacePanelTopBarsCollapsed).mockReturnValue(true);
    vi.mocked(useWorkspacePanelStatusBarCollapsed).mockReturnValue(true);
    const sidebar = { handleAddLocation: vi.fn(), handleRemoveLocation: vi.fn(), handleSelectDocument: vi.fn() };
    const toolbar = { saveStatus: "Idle" as const, onSave: vi.fn(), onOpenSettings: vi.fn() };
    const tabs = {
      tabs: [],
      activeTabId: null,
      handleSelectTab: vi.fn(),
      handleCloseTab: vi.fn(),
      handleReorderTabs: vi.fn(),
    };
    const editor = {
      initialText: "# Split",
      onChange: vi.fn(),
      onSave: vi.fn(),
      onCursorMove: vi.fn(),
      onSelectionChange: vi.fn(),
    };
    const preview = {
      renderResult: {
        html: "<p>Preview content</p>",
        metadata: { title: null, outline: [], links: [], task_items: { total: 0, completed: 0 }, word_count: 2 },
      },
      theme: "dark" as const,
      editorLine: 1,
      onScrollToLine: vi.fn(),
    };
    const statusBar = { stats: { cursorLine: 1, cursorColumn: 1, wordCount: 0, charCount: 0 } };

    render(
      <WorkspacePanel
        sidebar={sidebar}
        toolbar={toolbar}
        tabs={tabs}
        editor={editor}
        preview={preview}
        statusBar={statusBar} />,
    );

    const separator = screen.getByRole("separator", { name: "Resize split panes" });
    const editorPane = screen.getByTestId("editor-container").parentElement as HTMLElement;
    const appWindow = globalThis as unknown as Window;
    const initialWidth = Number.parseFloat(editorPane.style.width);

    fireEvent.pointerDown(separator, { clientX: initialWidth });
    fireEvent.pointerMove(appWindow, { clientX: initialWidth + 120 });
    fireEvent.pointerUp(appWindow);

    expect(editorPane).toHaveStyle({ width: `${initialWidth + 120}px` });
  });
});
