import { DocumentTabs, type DocumentTabsProps } from "$components/DocumentTabs";
import { Editor, type EditorProps } from "$components/Editor";
import { Preview, type PreviewProps } from "$components/Preview";
import { Sidebar, type SidebarProps } from "$components/Sidebar";
import { StatusBar, type StatusBarProps } from "$components/StatusBar";
import { Toolbar, type ToolbarProps } from "$components/Toolbar";
import { useResizable } from "$hooks/useResizable";
import { useViewportTier } from "$hooks/useViewportTier";
import {
  useWorkspacePanelModeState,
  useWorkspacePanelSidebarState,
  useWorkspacePanelStatusBarCollapsed,
  useWorkspacePanelTopBarsCollapsed,
} from "$state/panel-selectors";
import { PanelMode } from "$types";
import { type PointerEventHandler, useCallback, useEffect, useMemo } from "react";

type K = "initialText" | "presentation" | "onChange" | "onSave" | "onCursorMove" | "onSelectionChange";
export type WorkspaceEditorProps = Pick<EditorProps, K>;

type PK = "renderResult" | "theme" | "editorLine" | "onScrollToLine";
export type WorkspacePreviewProps = Pick<PreviewProps, PK>;

export type CalmUiVisibility = { sidebar: boolean; statusBar: boolean; tabBar: boolean };

export type WorkspacePanelProps = {
  sidebar: Pick<
    SidebarProps,
    "handleAddLocation" | "handleRemoveLocation" | "handleSelectDocument" | "handleCreateNewDocument"
  >;
  toolbar: Pick<
    ToolbarProps,
    | "saveStatus"
    | "hasActiveDocument"
    | "onSave"
    | "onNewDocument"
    | "isNewDocumentDisabled"
    | "onOpenSettings"
    | "onExportPdf"
    | "isExportingPdf"
    | "isPdfExportDisabled"
    | "onRefresh"
  >;
  tabs: DocumentTabsProps;
  editor: WorkspaceEditorProps;
  preview: WorkspacePreviewProps;
  statusBar: StatusBarProps;
  calmUiVisibility?: CalmUiVisibility;
};

const SPLIT_PANEL_MIN_WIDTH = 280;
const SPLIT_PANEL_THRESHOLD = SPLIT_PANEL_MIN_WIDTH * 2 + 96;
const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 480;
const FALLBACK_VIEWPORT_WIDTH = 1280;

type MainPanelProps = {
  panelMode: PanelMode;
  editor: WorkspaceEditorProps;
  preview: WorkspacePreviewProps;
  splitEditorWidth: number;
  isSplitResizing: boolean;
  onSplitResizeStart: PointerEventHandler<HTMLDivElement>;
};

const MainPanel = (
  { panelMode, editor, preview, splitEditorWidth, isSplitResizing, onSplitResizeStart }: MainPanelProps,
) => {
  const splitEditorStyle = useMemo(() => ({ width: `${splitEditorWidth}px` }), [splitEditorWidth]);

  if (panelMode === "split") {
    return (
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex min-h-0 min-w-0 shrink-0 flex-col" style={splitEditorStyle}>
          <Editor {...editor} />
        </div>

        <div
          role="separator"
          aria-label="Resize split panes"
          aria-orientation="vertical"
          onPointerDown={onSplitResizeStart}
          className={`relative z-10 w-1 shrink-0 cursor-col-resize transition-colors ${
            isSplitResizing ? "bg-border-interactive" : "bg-border-subtle hover:bg-border-strong"
          }`} />

        <Preview className="min-h-0 min-w-0 flex-1 bg-bg-primary" {...preview} />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex overflow-hidden">
      {panelMode === "editor" && (
        <div className="flex min-h-0 min-w-0 flex-col w-full">
          <Editor {...editor} />
        </div>
      )}

      {panelMode === "preview" && <Preview className="min-h-0 min-w-0 flex-1 w-full bg-bg-primary" {...preview} />}
    </div>
  );
};

function getPanelMode(isSplitView: boolean, isPreviewVisible: boolean): PanelMode {
  if (isSplitView && isPreviewVisible) {
    return "split";
  }

  if (isPreviewVisible) {
    return "preview";
  }

  return "editor";
}

export function WorkspacePanel(
  { sidebar, toolbar, tabs, editor, preview, statusBar, calmUiVisibility }: WorkspacePanelProps,
) {
  const { viewportWidth } = useViewportTier(FALLBACK_VIEWPORT_WIDTH);
  const { sidebarCollapsed } = useWorkspacePanelSidebarState();
  const { isSplitView, isPreviewVisible } = useWorkspacePanelModeState();
  const topBarsCollapsed = useWorkspacePanelTopBarsCollapsed();
  const statusBarCollapsed = useWorkspacePanelStatusBarCollapsed();
  const panelMode = useMemo(() => getPanelMode(isSplitView, isPreviewVisible), [isSplitView, isPreviewVisible]);
  const sidebarMaxWidth = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, viewportWidth - 280));

  const effectiveSidebarVisible = calmUiVisibility ? calmUiVisibility.sidebar && !sidebarCollapsed : !sidebarCollapsed;
  const effectiveTabBarVisible = calmUiVisibility ? calmUiVisibility.tabBar && !topBarsCollapsed : !topBarsCollapsed;
  const effectiveStatusBarVisible = calmUiVisibility
    ? calmUiVisibility.statusBar && !statusBarCollapsed
    : !statusBarCollapsed;

  const { size: sidebarWidth, isResizing, startResizing, setSize: setSidebarWidth } = useResizable({
    initialSize: 280,
    minSize: SIDEBAR_MIN_WIDTH,
    maxSize: sidebarMaxWidth,
    axis: "x",
  });

  const splitAvailableWidth = Math.max(
    SPLIT_PANEL_MIN_WIDTH,
    viewportWidth - (effectiveSidebarVisible ? sidebarWidth : 0),
  );
  const splitMaxWidth = Math.max(SPLIT_PANEL_MIN_WIDTH, splitAvailableWidth - SPLIT_PANEL_MIN_WIDTH);
  const splitFeasible = splitAvailableWidth >= SPLIT_PANEL_THRESHOLD;
  const effectivePanelMode = panelMode === "split" && !splitFeasible ? "editor" : panelMode;

  const {
    size: splitEditorWidth,
    isResizing: isSplitResizing,
    startResizing: startSplitResizing,
    setSize: setSplitEditorWidth,
  } = useResizable({
    initialSize: Math.round(viewportWidth / 2),
    minSize: SPLIT_PANEL_MIN_WIDTH,
    maxSize: splitMaxWidth,
    axis: "x",
  });

  useEffect(() => {
    if (sidebarWidth > sidebarMaxWidth) {
      setSidebarWidth(sidebarMaxWidth);
    }
  }, [sidebarWidth, sidebarMaxWidth, setSidebarWidth]);

  useEffect(() => {
    if (splitEditorWidth > splitMaxWidth) {
      setSplitEditorWidth(splitMaxWidth);
      return;
    }

    if (splitEditorWidth < SPLIT_PANEL_MIN_WIDTH) {
      setSplitEditorWidth(SPLIT_PANEL_MIN_WIDTH);
    }
  }, [splitEditorWidth, splitMaxWidth, setSplitEditorWidth]);

  const handleSidebarResizeStart: PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    event.preventDefault();
    startResizing(event.clientX);
  }, [startResizing]);
  const handleSplitResizeStart: PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    event.preventDefault();
    startSplitResizing(event.clientX);
  }, [startSplitResizing]);

  const sidebarStyle = useMemo(() => ({ width: `${sidebarWidth}px` }), [sidebarWidth]);

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {effectiveSidebarVisible
        ? (
          <div className="relative flex h-full shrink-0" style={sidebarStyle}>
            <Sidebar {...sidebar} />
            <div
              role="separator"
              aria-label="Resize sidebar"
              aria-orientation="vertical"
              onPointerDown={handleSidebarResizeStart}
              className={`absolute inset-y-0 right-0 w-1 cursor-col-resize transition-colors ${
                isResizing ? "bg-border-interactive" : "hover:bg-border-subtle"
              }`} />
          </div>
        )
        : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Toolbar {...toolbar} />
        {effectiveTabBarVisible ? <DocumentTabs {...tabs} /> : null}
        <MainPanel
          panelMode={effectivePanelMode}
          editor={editor}
          preview={preview}
          splitEditorWidth={splitEditorWidth}
          isSplitResizing={isSplitResizing}
          onSplitResizeStart={handleSplitResizeStart} />
        {effectiveStatusBarVisible ? <StatusBar {...statusBar} /> : null}
      </div>
    </div>
  );
}
