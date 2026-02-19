import { type PointerEventHandler, useCallback, useMemo } from "react";
import { useResizable } from "../../hooks/useResizable";
import { PanelMode } from "../../types";
import { DocumentTabs, type DocumentTabsProps } from "../DocumentTabs";
import { Editor, type EditorProps } from "../Editor";
import { Preview, type PreviewProps } from "../Preview";
import { Sidebar, type SidebarProps } from "../Sidebar";
import { StatusBar, type StatusBarProps } from "../StatusBar";
import { Toolbar, type ToolbarProps } from "../Toolbar";

export type WorkspaceLayoutProps = {
  sidebarCollapsed: boolean;
  topBarsCollapsed: boolean;
  statusBarCollapsed: boolean;
  isSplitView: boolean;
  isPreviewVisible: boolean;
};

type K = "initialText" | "theme" | "showLineNumbers" | "onChange" | "onSave" | "onCursorMove" | "onSelectionChange";
export type WorkspaceEditorProps = Pick<EditorProps, K>;

type PK = "renderResult" | "theme" | "editorLine" | "onScrollToLine";
export type WorkspacePreviewProps = Pick<PreviewProps, PK>;

export type WorkspacePanelProps = {
  layout: WorkspaceLayoutProps;
  onToggleSidebar: () => void;
  sidebar: SidebarProps;
  toolbar: ToolbarProps;
  tabs: DocumentTabsProps;
  editor: WorkspaceEditorProps;
  preview: WorkspacePreviewProps;
  statusBar: StatusBarProps;
};

type MainPanelProps = { panelMode: PanelMode; editor: WorkspaceEditorProps; preview: WorkspacePreviewProps };

const MainPanel = ({ panelMode, editor, preview }: MainPanelProps) => (
  <div className="flex-1 min-h-0 flex overflow-hidden">
    {(panelMode === "editor" || panelMode === "split") && (
      <div className={`flex min-h-0 min-w-0 flex-col ${panelMode === "split" ? "flex-1 w-1/2" : "w-full"}`}>
        <Editor {...editor} />
      </div>
    )}

    {(panelMode === "preview" || panelMode === "split") && (
      <Preview
        className={`min-h-0 min-w-0 flex-1 ${
          panelMode === "split" ? "w-1/2 border-l border-border-subtle" : "w-full"
        } bg-bg-primary`}
        {...preview} />
    )}
  </div>
);

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
  { layout, onToggleSidebar, sidebar, toolbar, tabs, editor, preview, statusBar }: WorkspacePanelProps,
) {
  const panelMode = useMemo(() => getPanelMode(layout.isSplitView, layout.isPreviewVisible), [
    layout.isSplitView,
    layout.isPreviewVisible,
  ]);

  const { size: sidebarWidth, isResizing, startResizing } = useResizable({
    initialSize: 280,
    minSize: 220,
    maxSize: 480,
    axis: "x",
  });

  const handleSidebarResizeStart: PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    event.preventDefault();
    startResizing(event.clientX);
  }, [startResizing]);

  const sidebarStyle = useMemo(() => ({ width: `${sidebarWidth}px` }), [sidebarWidth]);

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {layout.sidebarCollapsed ? null : (
        <div className="relative flex h-full shrink-0" style={sidebarStyle}>
          <Sidebar {...sidebar} onToggleCollapse={onToggleSidebar} />
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
        {layout.topBarsCollapsed ? null : <DocumentTabs {...tabs} />}
        <MainPanel panelMode={panelMode} editor={editor} preview={preview} />
        {layout.statusBarCollapsed ? null : <StatusBar {...statusBar} />}
      </div>
    </div>
  );
}
