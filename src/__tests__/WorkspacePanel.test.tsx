/* oxlint-disable eslint-plugin-react-perf/jsx-no-new-object-as-prop */
import { EditorProps } from "$components/Editor";
import { WorkspacePanel } from "$components/layout/WorkspacePanel";
import type { CalmUiVisibility, WorkspacePanelProps } from "$components/layout/WorkspacePanel";
import { PreviewProps } from "$components/Preview";
import { StatusBarProps } from "$components/StatusBar";
import {
  useEditorPresentationState,
  useSidebarState,
  useToolbarState,
  useWorkspacePanelModeState,
  useWorkspacePanelSidebarState,
  useWorkspacePanelStatusBarCollapsed,
  useWorkspacePanelTopBarsCollapsed,
} from "$state/panel-selectors";
import type {
  EditorPresentationStateReturn,
  SidebarStateReturn,
  StatusBarCollapsedReturn,
  ToolbarStateReturn,
  TopBarsCollapsedReturn,
  WorkspacePanelModeStateReturn,
  WorkspacePanelSidebarStateReturn,
} from "$state/panel-selectors";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  calmUiVisibility?: CalmUiVisibility;
};

const createSidebarState = (overrides: Partial<SidebarStateReturn> = {}): SidebarStateReturn => ({
  locations: [],
  selectedLocationId: undefined,
  selectedDocPath: undefined,
  documents: [],
  isLoading: false,
  filterText: "",
  setFilterText: vi.fn(),
  selectLocation: vi.fn(),
  toggleSidebarCollapsed: vi.fn(),
  ...overrides,
});

const createToolbarState = (overrides: Partial<ToolbarStateReturn> = {}): ToolbarStateReturn => ({
  isSplitView: false,
  isFocusMode: false,
  isPreviewVisible: false,
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
};

const createWorkspacePanelProps = (overrides: WorkspacePanelPropOverrides = {}): WorkspacePanelProps => ({
  toolbar: { saveStatus: "Idle", onSave: vi.fn(), onOpenSettings: vi.fn(), ...overrides.toolbar },
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
  calmUiVisibility: overrides.calmUiVisibility,
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
});
