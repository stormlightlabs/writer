import { useMemo } from "react";
import { DocumentTabs, type DocumentTabsProps } from "../DocumentTabs";
import { Editor, type EditorProps } from "../Editor";
import { Preview, type PreviewProps } from "../Preview";
import { Sidebar, type SidebarProps } from "../Sidebar";
import { StatusBar, type StatusBarProps } from "../StatusBar";
import { Toolbar, type ToolbarProps } from "../Toolbar";

export type WorkspaceLayoutProps = { sidebarCollapsed: boolean; isSplitView: boolean; isPreviewVisible: boolean };

export type WorkspaceEditorProps = Pick<
  EditorProps,
  "initialText" | "theme" | "onChange" | "onSave" | "onCursorMove" | "onSelectionChange"
>;

export type WorkspacePreviewProps = Pick<PreviewProps, "renderResult" | "theme" | "editorLine" | "onScrollToLine">;

export type WorkspacePanelProps = {
  layout: WorkspaceLayoutProps;
  sidebar: SidebarProps;
  toolbar: ToolbarProps;
  tabs: DocumentTabsProps;
  editor: WorkspaceEditorProps;
  preview: WorkspacePreviewProps;
  statusBar: StatusBarProps;
};

type MainPanelProps = {
  mainCls: string;
  showPreview: boolean;
  editor: WorkspaceEditorProps;
  preview: WorkspacePreviewProps;
};

const MainPanel = ({ showPreview, editor, preview, mainCls }: MainPanelProps) => (
  <div className="flex-1 flex overflow-hidden">
    <div className={mainCls}>
      <Editor {...editor} />
    </div>

    {showPreview && <Preview className="flex-1 w-1/2 min-w-0 border-l border-border-subtle bg-layer-01" {...preview} />}
  </div>
);

export function WorkspacePanel({ layout, sidebar, toolbar, tabs, editor, preview, statusBar }: WorkspacePanelProps) {
  const showPreview = useMemo(() => layout.isSplitView && layout.isPreviewVisible, [
    layout.isSplitView,
    layout.isPreviewVisible,
  ]);
  const mainCls = useMemo(() => `flex flex-col min-w-0 ${showPreview ? "flex-1 w-1/2" : "w-full"}`, [showPreview]);

  return (
    <div className="flex flex-1 overflow-hidden">
      {layout.sidebarCollapsed ? null : <Sidebar {...sidebar} />}

      <div className="flex-1 flex flex-col min-w-0">
        <Toolbar {...toolbar} />
        <DocumentTabs {...tabs} />
        <MainPanel showPreview={showPreview} editor={editor} preview={preview} mainCls={mainCls} />
        <StatusBar {...statusBar} />
      </div>
    </div>
  );
}
