/* oxlint-disable eslint-plugin-react-perf/jsx-no-new-object-as-prop */
import { WorkspacePanel } from "$components/AppLayout/WorkspacePanel";
import type { WorkspaceDiagnosticsProps, WorkspacePanelProps } from "$components/AppLayout/WorkspacePanel";
import { EditorProps } from "$components/Editor";
import { PreviewProps } from "$components/Preview";
import { StatusBarProps } from "$components/StatusBar";
import { useSidebarActions } from "$hooks/controllers/useSidebarActions";
import { useWorkspaceController } from "$hooks/controllers/useWorkspaceController";
import {
  useEditorPresentationActions,
  useEditorPresentationState,
  useLayoutChromeActions,
  useLayoutSettingsUiState,
  useSidebarState,
  useToolbarState,
  useWorkspacePanelModeState,
  useWorkspacePanelSidebarState,
  useWorkspacePanelStatusBarCollapsed,
  useWorkspacePanelTopBarsCollapsed,
} from "$state/selectors";
import type {
  EditorPresentationStateReturn,
  SidebarStateReturn,
  StatusBarCollapsedReturn,
  ToolbarStateReturn,
  TopBarsCollapsedReturn,
  WorkspacePanelModeStateReturn,
  WorkspacePanelSidebarStateReturn,
} from "$state/selectors";
import type { MarkdownPreviewStyle } from "$types";
import { formatShortcut } from "$utils/shortcuts";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "$state/selectors",
  () => ({
    useSidebarState: vi.fn(),
    useToolbarState: vi.fn(),
    useEditorPresentationActions: vi.fn(),
    useLayoutChromeActions: vi.fn(),
    useLayoutSettingsUiState: vi.fn(),
    useEditorPresentationState: vi.fn(),
    useWorkspacePanelSidebarState: vi.fn(),
    useWorkspacePanelModeState: vi.fn(),
    useWorkspacePanelTopBarsCollapsed: vi.fn(),
    useWorkspacePanelStatusBarCollapsed: vi.fn(),
  }),
);
vi.mock("$hooks/controllers/useSidebarActions", () => ({ useSidebarActions: vi.fn() }));
vi.mock("$hooks/controllers/useWorkspaceController", () => ({ useWorkspaceController: vi.fn() }));

type SelectorOverrides = {
  sidebarState?: Partial<SidebarStateReturn>;
  toolbarState?: Partial<ToolbarStateReturn>;
  editorPresentationState?: Partial<EditorPresentationStateReturn>;
  setMarkdownPreviewStyle?: (value: MarkdownPreviewStyle) => void;
  workspacePanelSidebarState?: Partial<WorkspacePanelSidebarStateReturn>;
  workspacePanelModeState?: Partial<WorkspacePanelModeStateReturn>;
  topBarsCollapsed?: TopBarsCollapsedReturn;
  statusBarCollapsed?: StatusBarCollapsedReturn;
};

type WorkspacePanelPropOverrides = {
  toolbar?: Partial<WorkspacePanelProps["toolbar"]>;
  editor?: Partial<EditorProps>;
  preview?: Partial<PreviewProps>;
  statusBar?: Partial<StatusBarProps>;
  diagnostics?: Partial<WorkspaceDiagnosticsProps>;
};

const createSidebarState = (overrides: Partial<SidebarStateReturn> = {}): SidebarStateReturn => ({
  locations: [],
  selectedLocationId: undefined,
  selectedDocPath: undefined,
  documents: [],
  directories: [],
  isLoading: false,
  refreshingLocationId: undefined,
  sidebarRefreshReason: null,
  externalDropTargetId: undefined,
  externalDropFolderPath: undefined,
  activeDropTarget: null,
  folderSortOrderByLocation: {},
  filterText: "",
  setFilterText: vi.fn(),
  setDocuments: vi.fn(),
  setDirectories: vi.fn(),
  selectLocation: vi.fn(),
  toggleSidebarCollapsed: vi.fn(),
  filenameVisibility: false,
  setExternalDropTarget: vi.fn(),
  setActiveDropTarget: vi.fn(),
  reorderFolderSortOrder: vi.fn(),
  ...overrides,
});

const createToolbarState = (overrides: Partial<ToolbarStateReturn> = {}): ToolbarStateReturn => ({
  isSplitView: false,
  isFocusMode: false,
  isPreviewVisible: false,
  setEditorOnlyMode: vi.fn(),
  toggleSplitView: vi.fn(),
  toggleFocusMode: vi.fn(),
  togglePreviewVisible: vi.fn(),
  ...overrides,
});

const createEditorPresentationState = (
  overrides: Partial<EditorPresentationStateReturn> = {},
): EditorPresentationStateReturn => ({
  theme: "dark",
  showLineNumbers: true,
  textWrappingEnabled: true,
  syntaxHighlightingEnabled: true,
  fontSize: 16,
  fontFamily: "IBM Plex Mono",
  markdownPreviewStyle: "github",
  typewriterScrollingEnabled: false,
  focusDimmingMode: "off",
  posHighlightingEnabled: false,
  styleCheckSettings: {
    enabled: false,
    categories: { filler: true, redundancy: true, cliche: true },
    customPatterns: [],
    markerStyle: "highlight",
  },
  ...overrides,
});

const createWorkspacePanelSidebarState = (
  overrides: Partial<WorkspacePanelSidebarStateReturn> = {},
): WorkspacePanelSidebarStateReturn => ({ sidebarCollapsed: true, ...overrides });

const createWorkspacePanelModeState = (
  overrides: Partial<WorkspacePanelModeStateReturn> = {},
): WorkspacePanelModeStateReturn => ({ isSplitView: false, isPreviewVisible: false, ...overrides });

const mockPanelSelectors = (overrides: SelectorOverrides = {}): void => {
  vi.mocked(useSidebarState).mockReturnValue(createSidebarState(overrides.sidebarState));
  vi.mocked(useToolbarState).mockReturnValue(createToolbarState(overrides.toolbarState));
  vi.mocked(useEditorPresentationActions).mockReturnValue({
    setLineNumbersVisible: vi.fn(),
    toggleLineNumbersVisible: vi.fn(),
    setTextWrappingEnabled: vi.fn(),
    toggleTextWrappingEnabled: vi.fn(),
    setSyntaxHighlightingEnabled: vi.fn(),
    toggleSyntaxHighlightingEnabled: vi.fn(),
    setEditorFontSize: vi.fn(),
    setEditorFontFamily: vi.fn(),
    setMarkdownPreviewStyle: overrides.setMarkdownPreviewStyle ?? vi.fn(),
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
  vi.mocked(useEditorPresentationState).mockReturnValue(
    createEditorPresentationState(overrides.editorPresentationState),
  );
  vi.mocked(useWorkspacePanelSidebarState).mockReturnValue(
    createWorkspacePanelSidebarState(overrides.workspacePanelSidebarState),
  );
  vi.mocked(useWorkspacePanelModeState).mockReturnValue(
    createWorkspacePanelModeState(overrides.workspacePanelModeState),
  );
  vi.mocked(useWorkspacePanelTopBarsCollapsed).mockReturnValue(overrides.topBarsCollapsed ?? true);
  vi.mocked(useWorkspacePanelStatusBarCollapsed).mockReturnValue(overrides.statusBarCollapsed ?? true);
  vi.mocked(useWorkspaceController).mockReturnValue({
    locations: [],
    documents: [],
    selectedLocationId: undefined,
    selectedDocPath: undefined,
    locationDocuments: [],
    sidebarFilter: "",
    isSidebarLoading: false,
    isSessionHydrated: true,
    refreshingLocationId: undefined,
    sidebarRefreshReason: null,
    tabs: [],
    activeTabId: null,
    activeTab: null,
    setSidebarFilter: vi.fn(),
    markActiveTabModified: vi.fn(),
    handleAddLocation: vi.fn(),
    handleRemoveLocation: vi.fn(),
    handleSelectLocation: vi.fn(),
    handleSelectDocument: vi.fn(),
    handleSelectTab: vi.fn(),
    handleCloseTab: vi.fn(),
    handleReorderTabs: vi.fn(),
    handleCreateDraftTab: vi.fn(),
    handleCreateNewDocument: vi.fn(),
    handleRefreshSidebar: vi.fn(),
    handleRenameDocument: vi.fn(),
    handleMoveDocument: vi.fn(),
    handleMoveDirectory: vi.fn(),
    handleDeleteDocument: vi.fn(),
    handleCreateDirectory: vi.fn(),
    handleImportExternalFile: vi.fn(),
  });
  vi.mocked(useSidebarActions).mockReturnValue({
    handleAddLocation: vi.fn(),
    handleRemoveLocation: vi.fn(),
    handleSelectDocument: vi.fn(),
    handleCreateNewDocument: vi.fn(),
    handleRefreshSidebar: vi.fn(),
    handleRenameDocument: vi.fn(),
    handleMoveDocument: vi.fn(),
    handleMoveDirectory: vi.fn(),
    handleDeleteDocument: vi.fn(),
    handleImportExternalFile: vi.fn(),
  });
};

const createWorkspacePanelProps = (overrides: WorkspacePanelPropOverrides = {}): WorkspacePanelProps => ({
  toolbar: { saveStatus: "Idle", onSave: vi.fn(), ...overrides.toolbar },
  editor: {
    initialText: "# Document",
    onChange: vi.fn(),
    onSave: vi.fn(),
    onCursorMove: vi.fn(),
    onSelectionChange: vi.fn(),
    ...overrides.editor,
  },
  preview: {
    renderResult: {
      html: "<p>Preview content</p>",
      metadata: { title: null, outline: [], links: [], task_items: { total: 0, completed: 0 }, word_count: 2 },
    },
    theme: "dark",
    editorLine: 1,
    previewStyle: "github",
    editorFontFamily: "IBM Plex Mono",
    onScrollToLine: vi.fn(),
    ...overrides.preview,
  },
  statusBar: { stats: { cursorLine: 1, cursorColumn: 1, wordCount: 0, charCount: 0 }, ...overrides.statusBar },
  diagnostics: {
    isVisible: false,
    styleCheckEnabled: true,
    matches: [],
    onSelectMatch: vi.fn(),
    onClose: vi.fn(),
    onOpenSettings: vi.fn(),
    ...overrides.diagnostics,
  },
});

const renderWorkspacePanel = (
  propOverrides: WorkspacePanelPropOverrides = {},
  selectorOverrides: SelectorOverrides = {},
) => {
  mockPanelSelectors(selectorOverrides);
  return render(<WorkspacePanel {...createWorkspacePanelProps(propOverrides)} />);
};

describe("WorkspacePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders preview-only mode when preview is enabled without split view", () => {
    const { container } = renderWorkspacePanel({ editor: { initialText: "# Hidden" } }, {
      toolbarState: { isPreviewVisible: true },
      workspacePanelModeState: { isPreviewVisible: true },
    });

    expect(screen.getByText("Preview content")).toBeInTheDocument();
    expect(container.querySelector("[data-testid='editor-container']")).not.toBeInTheDocument();
  });

  it("switches preview chrome between Reading and Web modes", () => {
    const setMarkdownPreviewStyle = vi.fn();
    renderWorkspacePanel({ editor: { initialText: "# Visible" } }, {
      setMarkdownPreviewStyle,
      toolbarState: { isPreviewVisible: true },
      workspacePanelModeState: { isPreviewVisible: true },
    });

    fireEvent.click(screen.getByRole("button", { name: /web/i }));
    fireEvent.click(screen.getByRole("button", { name: /reading/i }));

    expect(setMarkdownPreviewStyle).toHaveBeenNthCalledWith(1, "pdf");
    expect(setMarkdownPreviewStyle).toHaveBeenNthCalledWith(2, "github");
  });

  it("renders sidebar controls and supports resizing", () => {
    const onToggleSidebar = vi.fn();

    renderWorkspacePanel({ editor: { initialText: "# Visible" } }, {
      sidebarState: { toggleSidebarCollapsed: onToggleSidebar },
      workspacePanelSidebarState: { sidebarCollapsed: false },
    });

    fireEvent.click(screen.getByTitle(`Hide sidebar (${formatShortcut("Cmd+B")})`));
    expect(onToggleSidebar).toHaveBeenCalledOnce();

    const separator = screen.getByRole("separator", { name: "Resize sidebar" });
    const sidebarContainer = separator.parentElement as HTMLElement;
    const appWindow = globalThis as unknown as Window;
    expect(sidebarContainer).toHaveStyle({ width: "256px" });

    fireEvent.pointerDown(separator, { clientX: 256 });
    fireEvent.pointerMove(appWindow, { clientX: 360 });
    fireEvent.pointerUp(appWindow);

    expect(sidebarContainer).toHaveStyle({ width: "360px" });
  });

  it("renders split mode and supports resizing between editor and preview", () => {
    renderWorkspacePanel({ editor: { initialText: "# Split" } }, {
      toolbarState: { isSplitView: true, isPreviewVisible: true },
      workspacePanelModeState: { isSplitView: true, isPreviewVisible: true },
    });

    const separator = screen.getByRole("separator", { name: "Resize split panes" });
    const editorPane = screen.getByTestId("editor-container").parentElement as HTMLElement;
    const appWindow = globalThis as unknown as Window;
    const initialWidth = Number.parseFloat(editorPane.style.width);

    fireEvent.pointerDown(separator, { clientX: initialWidth });
    fireEvent.pointerMove(appWindow, { clientX: initialWidth + 120 });
    fireEvent.pointerUp(appWindow);

    expect(editorPane).toHaveStyle({ width: `${initialWidth + 120}px` });
  });

  it("falls back from split mode to editor-only when viewport is too narrow", () => {
    Object.defineProperty(globalThis, "innerWidth", { configurable: true, writable: true, value: 540 });
    act(() => {
      globalThis.dispatchEvent(new Event("resize"));
    });

    const { container } = renderWorkspacePanel({ editor: { initialText: "# Split fallback" } }, {
      toolbarState: { isSplitView: true, isPreviewVisible: true },
      workspacePanelModeState: { isSplitView: true, isPreviewVisible: true },
    });

    expect(container.querySelector("[aria-label='Resize split panes']")).not.toBeInTheDocument();
    expect(screen.queryByText("Preview content")).not.toBeInTheDocument();
    expect(container.querySelector("[data-testid='editor-container']")).toBeInTheDocument();

    Object.defineProperty(globalThis, "innerWidth", { configurable: true, writable: true, value: 1024 });
    act(() => {
      globalThis.dispatchEvent(new Event("resize"));
    });
  });

  it("renders diagnostics panel and routes match actions", () => {
    const onSelectMatch = vi.fn();
    const onClose = vi.fn();
    const onOpenSettings = vi.fn();
    const match = {
      from: 6,
      to: 15,
      text: "basically",
      category: "filler" as const,
      replacement: "remove",
      line: 1,
      column: 6,
    };

    renderWorkspacePanel({
      diagnostics: {
        isVisible: true,
        styleCheckEnabled: true,
        matches: [match],
        onSelectMatch,
        onClose,
        onOpenSettings,
      },
    });

    expect(screen.getByText("Style Check")).toBeInTheDocument();
    fireEvent.click(screen.getByText("basically"));
    expect(onSelectMatch).toHaveBeenCalledWith(match);

    fireEvent.click(screen.getByLabelText("Close diagnostics panel"));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onOpenSettings).not.toHaveBeenCalled();
  });
});
