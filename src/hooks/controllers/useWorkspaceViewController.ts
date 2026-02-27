import type { WorkspaceEditorProps, WorkspacePanelProps } from "$components/layout/WorkspacePanel";
import { StatusBarProps } from "$components/StatusBar";
import { useDocumentSessionEffects } from "$hooks/app/useDocumentSessionEffects";
import { useEditorPreviewEffects } from "$hooks/app/useEditorPreviewEffects";
import { useSettingsSync } from "$hooks/app/useSettingsSync";
import { useWorkspaceController } from "$hooks/controllers/useWorkspaceController";
import { useDocumentActions } from "$hooks/useDocumentActions";
import { useEditor } from "$hooks/useEditor";
import { useEditorBridge } from "$hooks/useEditorBridge";
import { useHelpSheetHotkey } from "$hooks/useHelpSheetHotkey";
import { useLayoutHotkeys } from "$hooks/useLayoutHotkeys";
import { usePdfExport, usePdfExportUI } from "$hooks/usePdfExport";
import { usePreview } from "$hooks/usePreview";
import { useWorkspaceSync } from "$hooks/useWorkspaceSync";
import type { PdfExportOptions } from "$pdf/types";
import { useEditorPresentationStateRaw } from "$state/selectors";
import type { DocRef, Maybe } from "$types";
import { useMemo } from "react";

export type FocusModePanelProps = { editor: WorkspaceEditorProps; statusBar: StatusBarProps };

export type WorkspaceViewController = {
  workspacePanelProps: WorkspacePanelProps;
  focusModePanelProps: FocusModePanelProps;
  handleExportPdf: (options: PdfExportOptions) => Promise<void>;
};

function isSameDocRef(left: Maybe<DocRef>, right: Maybe<DocRef>): boolean {
  if (!left || !right) {
    return false;
  }

  return left.location_id === right.location_id && left.rel_path === right.rel_path;
}

export function useWorkspaceViewController(): WorkspaceViewController {
  const { model: editorModel, dispatch: editorDispatch, openDoc } = useEditor();
  const { model: previewModel, render: renderPreview, syncLine: syncPreviewLine, setDoc: setPreviewDoc } = usePreview();
  const exportPdf = usePdfExport();

  useWorkspaceSync();
  useLayoutHotkeys();
  useHelpSheetHotkey();

  const editorPresentation = useEditorPresentationStateRaw();
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
    () => ({ toolbar: toolbarProps, editor: editorProps, preview: previewProps, statusBar: statusBarProps }),
    [toolbarProps, editorProps, previewProps, statusBarProps],
  );

  return { workspacePanelProps, focusModePanelProps, handleExportPdf };
}
