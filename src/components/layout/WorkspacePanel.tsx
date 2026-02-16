import { useMemo } from "react";
import { DocumentTabs, type DocumentTabsProps } from "../DocumentTabs";
import { Editor, type EditorProps } from "../Editor";
import { Sidebar, type SidebarProps } from "../Sidebar";
import { StatusBar, type StatusBarProps } from "../StatusBar";
import { Toolbar, type ToolbarProps } from "../Toolbar";

export type WorkspaceLayoutProps = { sidebarCollapsed: boolean; isSplitView: boolean; isPreviewVisible: boolean };

export type WorkspaceEditorProps = Pick<
  EditorProps,
  "initialText" | "theme" | "onChange" | "onSave" | "onCursorMove" | "onSelectionChange"
>;

export type WorkspacePanelProps = {
  layout: WorkspaceLayoutProps;
  sidebar: SidebarProps;
  toolbar: ToolbarProps;
  tabs: DocumentTabsProps;
  editor: WorkspaceEditorProps;
  statusBar: StatusBarProps;
};

function RenderedPreview({ layout }: { layout: WorkspaceLayoutProps }) {
  return (layout.isSplitView && layout.isPreviewVisible
    ? (
      <div className="flex-1 w-1/2 min-w-0 border-l border-border-subtle bg-layer-01 p-6 overflow-auto">
        <div className="max-w-[700px] mx-auto text-text-secondary text-sm text-center pt-10 flex flex-col gap-2">
          <span>Preview will appear here</span>
          <span className="opacity-60">Markdown rendering coming soon</span>
        </div>
      </div>
    )
    : null);
}

function MainPanel(
  { layout, editor, mainCls }: { mainCls: string; layout: WorkspaceLayoutProps; editor: WorkspaceEditorProps },
) {
  return (
    <div className="flex-1 flex overflow-hidden">
      <div className={mainCls}>
        <Editor {...editor} />
      </div>

      <RenderedPreview layout={layout} />
    </div>
  );
}

export function WorkspacePanel({ layout, sidebar, toolbar, tabs, editor, statusBar }: WorkspacePanelProps) {
  const mainCls = useMemo(
    () => `flex flex-col min-w-0 ${layout.isSplitView && layout.isPreviewVisible ? "flex-1 w-1/2" : "w-full"}`,
    [layout.isSplitView, layout.isPreviewVisible],
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      {!layout.sidebarCollapsed && <Sidebar {...sidebar} />}

      <div className="flex-1 flex flex-col min-w-0">
        <Toolbar {...toolbar} />
        <DocumentTabs {...tabs} />
        <MainPanel layout={layout} editor={editor} mainCls={mainCls} />
        <StatusBar {...statusBar} />
      </div>
    </div>
  );
}
