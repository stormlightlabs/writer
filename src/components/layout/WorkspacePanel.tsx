import { DocumentTabs, type DocumentTabsProps } from "$components/DocumentTabs";
import { Editor, type EditorProps } from "$components/Editor";
import { Preview, type PreviewProps } from "$components/Preview";
import { Sidebar, type SidebarProps } from "$components/Sidebar";
import { StatusBar, type StatusBarProps } from "$components/StatusBar";
import { Toolbar, type ToolbarProps } from "$components/Toolbar";
import { useResizable } from "$hooks/useResizable";
import {
  useWorkspacePanelModeState,
  useWorkspacePanelSidebarState,
  useWorkspacePanelStatusBarCollapsed,
  useWorkspacePanelTopBarsCollapsed,
} from "$state/panel-selectors";
import { PanelMode } from "$types";
import { type PointerEventHandler, useCallback, useMemo } from "react";

type K = "initialText" | "presentation" | "onChange" | "onSave" | "onCursorMove" | "onSelectionChange";
export type WorkspaceEditorProps = Pick<EditorProps, K>;

type PK = "renderResult" | "theme" | "editorLine" | "onScrollToLine";
export type WorkspacePreviewProps = Pick<PreviewProps, PK>;

export type WorkspacePanelProps = {
  sidebar: Pick<SidebarProps, "handleAddLocation" | "handleRemoveLocation" | "handleSelectDocument">;
  toolbar: Pick<
    ToolbarProps,
    "saveStatus" | "onSave" | "onOpenSettings" | "onExportPdf" | "isExportingPdf" | "isPdfExportDisabled" | "onRefresh"
  >;
  tabs: DocumentTabsProps;
  editor: WorkspaceEditorProps;
  preview: WorkspacePreviewProps;
  statusBar: StatusBarProps;
};

const SPLIT_PANEL_MIN_WIDTH = 280;
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

export function WorkspacePanel({ sidebar, toolbar, tabs, editor, preview, statusBar }: WorkspacePanelProps) {
  const { sidebarCollapsed } = useWorkspacePanelSidebarState();
  const { isSplitView, isPreviewVisible } = useWorkspacePanelModeState();
  const topBarsCollapsed = useWorkspacePanelTopBarsCollapsed();
  const statusBarCollapsed = useWorkspacePanelStatusBarCollapsed();
  const panelMode = useMemo(() => getPanelMode(isSplitView, isPreviewVisible), [isSplitView, isPreviewVisible]);
  const viewportWidth = globalThis.innerWidth || FALLBACK_VIEWPORT_WIDTH;
  const splitMaxWidth = Math.max(SPLIT_PANEL_MIN_WIDTH, viewportWidth - SPLIT_PANEL_MIN_WIDTH);

  const { size: sidebarWidth, isResizing, startResizing } = useResizable({
    initialSize: 280,
    minSize: 220,
    maxSize: 480,
    axis: "x",
  });
  const { size: splitEditorWidth, isResizing: isSplitResizing, startResizing: startSplitResizing } = useResizable({
    initialSize: Math.round(viewportWidth / 2),
    minSize: SPLIT_PANEL_MIN_WIDTH,
    maxSize: splitMaxWidth,
    axis: "x",
  });

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
      {sidebarCollapsed ? null : (
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
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Toolbar {...toolbar} />
        {topBarsCollapsed ? null : <DocumentTabs {...tabs} />}
        <MainPanel
          panelMode={panelMode}
          editor={editor}
          preview={preview}
          splitEditorWidth={splitEditorWidth}
          isSplitResizing={isSplitResizing}
          onSplitResizeStart={handleSplitResizeStart} />
        {statusBarCollapsed ? null : <StatusBar {...statusBar} />}
      </div>
    </div>
  );
}
