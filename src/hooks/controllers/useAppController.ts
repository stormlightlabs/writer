import type { WorkspaceEditorProps, WorkspacePanelProps } from "$components/layout/WorkspacePanel";
import { StatusBarProps } from "$components/StatusBar";
import { useDocumentSessionEffects } from "$hooks/app/useDocumentSessionEffects";
import { useEditorPreviewEffects } from "$hooks/app/useEditorPreviewEffects";
import { useSettingsSync } from "$hooks/app/useSettingsSync";
import { useWorkspaceController } from "$hooks/controllers/useWorkspaceController";
import { useDocumentActions } from "$hooks/useDocumentActions";
import { useEditor } from "$hooks/useEditor";
import { useEditorBridge } from "$hooks/useEditorBridge";
import { useLayoutHotkeys } from "$hooks/useLayoutHotkeys";
import { usePdfExport, usePdfExportUI } from "$hooks/usePdfExport";
import { usePreview } from "$hooks/usePreview";
import { useWorkspaceSync } from "$hooks/useWorkspaceSync";
import type { PdfExportOptions } from "$pdf/types";
import {
  useEditorPresentationStateRaw,
  useLayoutChromeActions,
  useLayoutChromeState,
  useViewModeState,
} from "$state/selectors";
import type { AppTheme, DocRef } from "$types";
import { useCallback, useMemo } from "react";

export type FocusModePanelProps = { editor: WorkspaceEditorProps; statusBar: StatusBarProps };

export type AppController = {
  theme: AppTheme;
  isFocusMode: boolean;
  isSidebarCollapsed: boolean;
  showToggleControls: boolean;
  workspacePanelProps: WorkspacePanelProps;
  focusModePanelProps: FocusModePanelProps;
  handleShowSidebar: () => void;
  handleExportPdf: (options: PdfExportOptions) => Promise<void>;
};

function isSameDocRef(left: DocRef | null | undefined, right: DocRef | null | undefined): boolean {
  if (!left || !right) {
    return false;
  }

  return left.location_id === right.location_id && left.rel_path === right.rel_path;
}

export function useAppController(): AppController {
  const { model: editorModel, dispatch: editorDispatch, openDoc } = useEditor();
  const { model: previewModel, render: renderPreview, syncLine: syncPreviewLine, setDoc: setPreviewDoc } = usePreview();
  const exportPdf = usePdfExport();

  useWorkspaceSync();
  useLayoutHotkeys();

  const layoutChrome = useLayoutChromeState();
  const { setSidebarCollapsed } = useLayoutChromeActions();
  const editorPresentation = useEditorPresentationStateRaw();
  const { isFocusMode } = useViewModeState();
  const {
    locations,
    documents,
    selectedLocationId,
    isSidebarLoading,
    tabs,
    activeTab,
    markActiveTabModified,
    handleSelectDocument,
    handleCreateDraftTab,
    handleCreateNewDocument,
    handleRefreshSidebar,
  } = useWorkspaceController();

  const { handleSave, handleNewDocument } = useDocumentActions({
    editorDocRef: editorModel.docRef,
    selectedLocationId,
    documents,
    tabs,
    dispatchEditor: editorDispatch,
    createDraftTab: handleCreateDraftTab,
    createNewDocument: handleCreateNewDocument,
  });
  const { handleEditorChange, handleCursorMove, handleSelectionChange } = useEditorBridge({
    dispatchEditor: editorDispatch,
    syncPreviewLine,
  });
  const { handleOpenPdfExport, handleExportPdf } = usePdfExportUI({
    activeTab,
    text: editorModel.text,
    editorFontFamily: editorPresentation.editorFontFamily,
    exportPdf,
  });

  const hasOpenDocument = useMemo(() => isSameDocRef(activeTab?.docRef, editorModel.docRef), [
    activeTab,
    editorModel.docRef,
  ]);
  const hasLocations = useMemo(() => locations.length > 0, [locations.length]);

  const cursorPosition = useMemo(
    () => ({ cursorLine: editorModel.cursorLine, cursorColumn: editorModel.cursorColumn }),
    [editorModel.cursorLine, editorModel.cursorColumn],
  );

  const { wordCount, charCount, selectionCount } = useMemo(() => {
    const { text } = editorModel;
    const trimmedText = text.trim();

    return {
      wordCount: trimmedText ? trimmedText.split(/\s+/).length : 0,
      charCount: text.length,
      selectionCount: editorModel.selectionFrom !== null && editorModel.selectionTo !== null
        ? editorModel.selectionTo - editorModel.selectionFrom
        : undefined,
    };
  }, [editorModel.selectionFrom, editorModel.selectionTo, editorModel.text]);

  const editorStats = useMemo(() => ({ ...cursorPosition, wordCount, charCount, selectionCount }), [
    cursorPosition,
    wordCount,
    charCount,
    selectionCount,
  ]);

  const activeDocMeta = useMemo(() => {
    if (!activeTab) {
      return null;
    }

    const activeDoc = documents.find((doc) =>
      doc.location_id === activeTab.docRef.location_id && doc.rel_path === activeTab.docRef.rel_path
    );
    return activeDoc ?? null;
  }, [activeTab, documents]);

  const handleShowSidebar = useCallback(() => setSidebarCollapsed(false), [setSidebarCollapsed]);

  const activeDocRef = activeTab?.docRef ?? null;

  useDocumentSessionEffects({
    isSidebarLoading,
    locations,
    selectedLocationId,
    tabs,
    activeTab,
    documentsCount: documents.length,
    activeDocRef,
    openDoc,
    handleSelectDocument,
    handleNewDocument,
  });

  useEditorPreviewEffects({
    activeTab,
    text: editorModel.text,
    saveStatus: editorModel.saveStatus,
    markActiveTabModified,
    setPreviewDoc,
    renderPreview,
    handleRefreshSidebar,
  });

  useSettingsSync();

  const calmUiEffectiveVisibility = useMemo(() => {
    return { sidebar: true, statusBar: true, tabBar: true };
  }, []);

  const toolbarProps = useMemo(
    () => ({
      saveStatus: editorModel.saveStatus,
      hasActiveDocument: hasOpenDocument,
      onSave: handleSave,
      onNewDocument: handleNewDocument,
      isNewDocumentDisabled: !hasLocations,
      onExportPdf: handleOpenPdfExport,
      isPdfExportDisabled: !activeTab,
      onRefresh: handleRefreshSidebar,
    }),
    [
      editorModel.saveStatus,
      activeTab,
      handleOpenPdfExport,
      handleNewDocument,
      handleRefreshSidebar,
      hasLocations,
      handleSave,
      hasOpenDocument,
    ],
  );

  const editorProps = useMemo(
    () => ({
      initialText: editorModel.text,
      onChange: handleEditorChange,
      onSave: handleSave,
      onCursorMove: handleCursorMove,
      onSelectionChange: handleSelectionChange,
    }),
    [editorModel.text, handleEditorChange, handleSave, handleCursorMove, handleSelectionChange],
  );

  const statusBarProps = useMemo(() => ({ docMeta: activeDocMeta, stats: editorStats }), [activeDocMeta, editorStats]);

  const previewProps = useMemo(
    () => ({
      renderResult: previewModel.renderResult,
      theme: editorPresentation.theme,
      editorLine: editorModel.cursorLine,
      onScrollToLine: syncPreviewLine,
    }),
    [previewModel.renderResult, editorPresentation.theme, editorModel.cursorLine, syncPreviewLine],
  );

  const focusModePanelProps = useMemo(
    () => ({
      editor: {
        initialText: editorModel.text,
        onChange: handleEditorChange,
        onSave: handleSave,
        onCursorMove: handleCursorMove,
        onSelectionChange: handleSelectionChange,
      },
      statusBar: { docMeta: activeDocMeta, stats: editorStats },
    }),
    [
      activeDocMeta,
      editorStats,
      editorModel.text,
      handleEditorChange,
      handleSave,
      handleCursorMove,
      handleSelectionChange,
    ],
  );

  const workspacePanelProps = useMemo(
    () => ({
      toolbar: toolbarProps,
      editor: editorProps,
      preview: previewProps,
      statusBar: statusBarProps,
      calmUiVisibility: calmUiEffectiveVisibility,
    }),
    [toolbarProps, editorProps, previewProps, statusBarProps, calmUiEffectiveVisibility],
  );

  return {
    theme: editorPresentation.theme,
    isFocusMode,
    isSidebarCollapsed: layoutChrome.sidebarCollapsed,
    showToggleControls: layoutChrome.sidebarCollapsed,
    workspacePanelProps,
    focusModePanelProps,
    handleShowSidebar,
    handleExportPdf,
  };
}
