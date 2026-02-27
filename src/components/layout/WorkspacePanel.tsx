import { DocumentTabs } from "$components/DocumentTabs";
import { type EditorProps, EditorWithContainer } from "$components/Editor";
import { Preview, type PreviewProps } from "$components/Preview";
import { Sidebar } from "$components/Sidebar";
import { StatusBar, type StatusBarProps } from "$components/StatusBar";
import { Toolbar, type ToolbarProps } from "$components/Toolbar";
import { useSkipAnimation } from "$hooks/useMotion";
import { useResizable } from "$hooks/useResizable";
import { useViewportTier } from "$hooks/useViewportTier";
import {
  useWorkspacePanelModeState,
  useWorkspacePanelSidebarState,
  useWorkspacePanelStatusBarCollapsed,
  useWorkspacePanelTopBarsCollapsed,
} from "$state/selectors";
import { PanelMode } from "$types";
import { AnimatePresence, EasingDefinition, motion } from "motion/react";
import { type PointerEventHandler, useCallback, useEffect, useMemo } from "react";

type K = "initialText" | "presentation" | "onChange" | "onSave" | "onCursorMove" | "onSelectionChange";
export type WorkspaceEditorProps = Pick<EditorProps, K>;

type PK = "renderResult" | "theme" | "editorLine" | "onScrollToLine";
export type WorkspacePreviewProps = Pick<PreviewProps, PK>;

export type WorkspacePanelProps = {
  toolbar: Pick<
    ToolbarProps,
    | "saveStatus"
    | "hasActiveDocument"
    | "onSave"
    | "onNewDocument"
    | "isNewDocumentDisabled"
    | "onExportPdf"
    | "isExportingPdf"
    | "isPdfExportDisabled"
    | "onRefresh"
  >;
  editor: WorkspaceEditorProps;
  preview: WorkspacePreviewProps;
  statusBar: StatusBarProps;
};

const SPLIT_PANEL_MIN_WIDTH = 280;
const SPLIT_PANEL_THRESHOLD = SPLIT_PANEL_MIN_WIDTH * 2 + 96;
const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 480;
const FALLBACK_VIEWPORT_WIDTH = 1280;
const NO_MOTION_TRANSITION = { duration: 0 };
const CHROME_SECTION_TRANSITION = { duration: 0.2, ease: "easeOut" as const };

type MainPanelProps = {
  panelMode: PanelMode;
  editor: WorkspaceEditorProps;
  preview: WorkspacePreviewProps;
  splitEditorWidth: number;
  isSplitResizing: boolean;
  onSplitResizeStart: PointerEventHandler<HTMLDivElement>;
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

function MainPanel(
  { panelMode, editor, preview, splitEditorWidth, isSplitResizing, onSplitResizeStart }: MainPanelProps,
) {
  const container = useMemo(() => {
    if (panelMode === "split") {
      return { className: "flex min-h-0 min-w-0 shrink-0 flex-col", style: { width: `${splitEditorWidth}px` } };
    }
    return { className: "flex min-h-0 min-w-0 flex-col w-full" };
  }, [panelMode, splitEditorWidth]);

  if (panelMode === "split") {
    return (
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <EditorWithContainer {...editor} container={container} />
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
      {panelMode === "editor" && <EditorWithContainer {...editor} container={container} />}
      {panelMode === "preview" && <Preview className="min-h-0 min-w-0 flex-1 w-full bg-bg-primary" {...preview} />}
    </div>
  );
}

type SectionProps = {
  children: React.ReactNode;
  initial: { opacity: number; x?: number; y?: number; height?: number | string };
  animate: { opacity: number; x?: number; y?: number; height?: number | string };
  exit: { opacity: number; x?: number; y?: number; height?: number | string };
  transition: { duration: number; ease?: EasingDefinition };
  className: string;
  style?: React.CSSProperties;
  isVisible: boolean;
};

function Section({ children, initial, animate, exit, transition, className, style, isVisible }: SectionProps) {
  return (
    <AnimatePresence initial={false}>
      {isVisible && (
        <motion.div
          initial={initial}
          animate={animate}
          exit={exit}
          transition={transition}
          className={className}
          style={style}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function WorkspacePanel({ toolbar, editor, preview, statusBar }: WorkspacePanelProps) {
  const skipAnimation = useSkipAnimation();
  const { viewportWidth } = useViewportTier(FALLBACK_VIEWPORT_WIDTH);
  const { sidebarCollapsed } = useWorkspacePanelSidebarState();
  const { isSplitView, isPreviewVisible } = useWorkspacePanelModeState();
  const topBarsCollapsed = useWorkspacePanelTopBarsCollapsed();
  const statusBarCollapsed = useWorkspacePanelStatusBarCollapsed();
  const panelMode = useMemo(() => getPanelMode(isSplitView, isPreviewVisible), [isSplitView, isPreviewVisible]);
  const sidebarMaxWidth = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, viewportWidth - 280));

  const effectiveSidebarVisible = !sidebarCollapsed;
  const effectiveTabBarVisible = !topBarsCollapsed;
  const effectiveStatusBarVisible = !statusBarCollapsed;

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

  const sectionTransition = useMemo(() => skipAnimation ? NO_MOTION_TRANSITION : CHROME_SECTION_TRANSITION, [
    skipAnimation,
  ]);

  const newDocumentHandler = useMemo(() => toolbar.isNewDocumentDisabled ? void 0 : toolbar.onNewDocument, [
    toolbar.isNewDocumentDisabled,
    toolbar.onNewDocument,
  ]);

  const sidebarMotionProps = useMemo(
    () => ({
      initial: { opacity: 0, x: -16 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -12 },
      transition: sectionTransition,
    }),
    [sectionTransition],
  );

  const tabBarMotionProps = useMemo(
    () => ({
      initial: { opacity: 0, y: -8, height: 0 },
      animate: { opacity: 1, y: 0, height: "auto" },
      exit: { opacity: 0, y: -8, height: 0 },
      transition: sectionTransition,
    }),
    [sectionTransition],
  );

  const statusBarMotionProps = useMemo(
    () => ({
      initial: { opacity: 0, y: 8, height: 0 },
      animate: { opacity: 1, y: 0, height: "auto" },
      exit: { opacity: 0, y: 8, height: 0 },
      transition: sectionTransition,
    }),
    [sectionTransition],
  );

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <Section
        isVisible={effectiveSidebarVisible}
        {...sidebarMotionProps}
        className="relative flex h-full shrink-0"
        style={sidebarStyle}>
        <Sidebar onNewDocument={newDocumentHandler} />
        <div
          role="separator"
          aria-label="Resize sidebar"
          aria-orientation="vertical"
          onPointerDown={handleSidebarResizeStart}
          className={`absolute inset-y-0 right-0 w-1 cursor-col-resize transition-colors ${
            isResizing ? "bg-border-interactive" : "hover:bg-border-subtle"
          }`} />
      </Section>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Toolbar {...toolbar} />
        <Section isVisible={effectiveTabBarVisible} {...tabBarMotionProps} className="overflow-hidden">
          <DocumentTabs onNewDocument={newDocumentHandler} />
        </Section>
        <MainPanel
          panelMode={effectivePanelMode}
          editor={editor}
          preview={preview}
          splitEditorWidth={splitEditorWidth}
          isSplitResizing={isSplitResizing}
          onSplitResizeStart={handleSplitResizeStart} />

        <Section isVisible={effectiveStatusBarVisible} {...statusBarMotionProps} className="overflow-hidden">
          <StatusBar {...statusBar} />
        </Section>
      </div>
    </div>
  );
}
