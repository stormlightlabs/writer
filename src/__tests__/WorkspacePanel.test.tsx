/* oxlint-disable eslint-plugin-react-perf/jsx-no-new-object-as-prop */
import { EditorProps } from "$components/Editor";
import { WorkspacePanel } from "$components/layout/WorkspacePanel";
import type { WorkspaceDiagnosticsProps, WorkspacePanelProps } from "$components/layout/WorkspacePanel";
import { PreviewProps } from "$components/Preview";
import { StatusBarProps } from "$components/StatusBar";
import { useWorkspaceController } from "$hooks/controllers/useWorkspaceController";
import {
  useEditorPresentationState,
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
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "$state/selectors",
  () => ({
    useSidebarState: vi.fn(),
    useToolbarState: vi.fn(),
    useLayoutSettingsUiState: vi.fn(),
    useEditorPresentationState: vi.fn(),
    useWorkspacePanelSidebarState: vi.fn(),
    useWorkspacePanelModeState: vi.fn(),
    useWorkspacePanelTopBarsCollapsed: vi.fn(),
    useWorkspacePanelStatusBarCollapsed: vi.fn(),
  }),
);
vi.mock("$hooks/controllers/useWorkspaceController", () => ({ useWorkspaceController: vi.fn() }));

type SelectorOverrides = {
  sidebarState?: Partial<SidebarStateReturn>;
  toolbarState?: Partial<ToolbarStateReturn>;
  editorPresentationState?: Partial<EditorPresentationStateReturn>;
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
  isLoading: false,
  refreshingLocationId: undefined,
  sidebarRefreshReason: null,
  filterText: "",
  setFilterText: vi.fn(),
  selectLocation: vi.fn(),
  toggleSidebarCollapsed: vi.fn(),
  filenameVisibility: false,
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
    handleDeleteDocument: vi.fn(),
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

  it("renders sidebar controls and supports resizing", () => {
    const onToggleSidebar = vi.fn();

    renderWorkspacePanel({ editor: { initialText: "# Visible" } }, {
      sidebarState: { toggleSidebarCollapsed: onToggleSidebar },
      workspacePanelSidebarState: { sidebarCollapsed: false },
    });

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
