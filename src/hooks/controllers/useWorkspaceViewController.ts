import type {
  WorkspaceEditorProps,
  WorkspacePanelProps,
  WorkspaceWelcomeProps,
} from "$components/AppLayout/WorkspacePanel";
import { StatusBarProps } from "$components/StatusBar";
import type { StyleMatch } from "$editor/types";
import { useDocumentSessionEffects } from "$hooks/app/useDocumentSessionEffects";
import { useEditorPreviewEffects } from "$hooks/app/useEditorPreviewEffects";
import { useSettingsSync } from "$hooks/app/useSettingsSync";
import { useAtProtoController } from "$hooks/controllers/useAtProtoController";
import { useStandardSiteController } from "$hooks/controllers/useStandardSiteController";
import { useWorkspaceController } from "$hooks/controllers/useWorkspaceController";
import { useDocumentActions } from "$hooks/useDocumentActions";
import { useEditor } from "$hooks/useEditor";
import { useEditorBridge } from "$hooks/useEditorBridge";
import { useEditorImageHandlers } from "$hooks/useEditorImageHandlers";
import { useHelpSheetHotkey } from "$hooks/useHelpSheetHotkey";
import { useLayoutHotkeys } from "$hooks/useLayoutHotkeys";
import { usePdfExport, usePdfExportUI } from "$hooks/usePdfExport";
import { usePreview } from "$hooks/usePreview";
import { useRoutedSheet } from "$hooks/useRoutedSheet";
import { useWorkspaceSync } from "$hooks/useWorkspaceSync";
import type { PdfExportOptions, PdfRenderResult } from "$pdf/types";
import { useEditorPresentationState } from "$state/selectors";
import type { DocRef, EditorFontFamily, Maybe, RenderedFontFamily, SaveStatus } from "$types";
import { isImageContentType, isImagePath } from "$utils/documents";
import { useCallback, useEffect, useMemo, useState } from "react";

export type FocusModePanelProps = {
  editor: WorkspaceEditorProps;
  statusBar: StatusBarProps;
  saveStatus: SaveStatus;
  hasActiveDocument: boolean;
  onSave: () => void;
};

export type WorkspaceViewController = {
  workspacePanelProps: WorkspacePanelProps;
  focusModePanelProps: FocusModePanelProps;
  handleExportPdf: (options: PdfExportOptions) => Promise<void>;
  previewResult: PdfRenderResult | null;
  activeDocLocationId: number | undefined;
  activeDocRelPath: string | undefined;
  editorFontFamily: EditorFontFamily;
  renderedFontFamily: RenderedFontFamily;
  editorText: string;
  atProto: ReturnType<typeof useAtProtoController>;
  standardSite: ReturnType<typeof useStandardSiteController>;
};

export function deriveWordCount(text: string, renderWordCount: number | undefined): number {
  if (typeof renderWordCount === "number") {
    return renderWordCount;
  }

  const trimmedText = text.trim();
  return trimmedText ? trimmedText.split(/\s+/).length : 0;
}

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

  const editorPresentation = useEditorPresentationState();
  const { isOpen: diagnosticsVisible, close: closeDiagnostics } = useRoutedSheet("/diagnostics");
  const { open: openSettingsRoute } = useRoutedSheet("/settings");
  const [styleMatches, setStyleMatches] = useState<StyleMatch[]>([]);
  const [styleSelection, setStyleSelection] = useState<{ from: number; to: number; requestId: number } | null>(null);
  const [isWelcomeTabOpen, setWelcomeTabOpen] = useState(false);
  const {
    locations,
    documents,
    documentsByLocation,
    selectedLocationId,
    isSidebarLoading,
    isSessionHydrated,
    tabs,
    activeTab,
    markActiveTabModified,
    handleSelectDocument,
    handleCreateDraftTab,
    handleCreateNewDocument,
    handleAddLocation,
    handleRefreshSidebar,
  } = useWorkspaceController();
  const atProto = useAtProtoController({ locations, selectedLocationId, refreshSidebar: handleRefreshSidebar });
  const standardSite = useStandardSiteController({
    locations,
    selectedLocationId,
    refreshSidebar: handleRefreshSidebar,
  });

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

  const imageLocationId = editorModel.docRef?.location_id ?? null;
  const imageDocRelPath = editorModel.docRef?.rel_path ?? null;
  const { insertAt, handleImageFilePaste, handlePickAndInsertImage } = useEditorImageHandlers(
    imageLocationId,
    imageDocRelPath,
  );
  const { handleOpenPdfExport, handleExportPdf, previewResult, activeDocLocationId, activeDocRelPath } = usePdfExportUI(
    { activeTab, text: editorModel.text, renderedFontFamily: editorPresentation.renderedFontFamily, exportPdf },
  );

  const hasOpenDocument = useMemo(() => isSameDocRef(activeTab?.docRef, editorModel.docRef), [
    activeTab,
    editorModel.docRef,
  ]);
  const isImageDocument = useMemo(
    () =>
      isImageContentType(editorModel.contentType)
      || (editorModel.docRef ? isImagePath(editorModel.docRef.rel_path) : false),
    [editorModel.contentType, editorModel.docRef],
  );
  const hasEditableDocument = hasOpenDocument && !isImageDocument;
  const hasLocations = useMemo(() => locations.length > 0, [locations.length]);
  const openLocationDocumentCount = useMemo(() =>
    locations.reduce((count, location) => {
      const cachedDocuments = documentsByLocation[location.id];
      if (cachedDocuments) {
        return count + cachedDocuments.length;
      }

      if (selectedLocationId === location.id) {
        return count + documents.filter((doc) => doc.location_id === location.id).length;
      }

      return count;
    }, 0), [documents, documentsByLocation, locations, selectedLocationId]);
  const showWelcomeScreen = useMemo(() => isSessionHydrated && (!activeTab || isWelcomeTabOpen), [
    activeTab,
    isSessionHydrated,
    isWelcomeTabOpen,
  ]);

  useEffect(() => {
    if (activeTab) {
      setWelcomeTabOpen(false);
    }
  }, [activeTab]);

  const handleOpenWelcomeTab = useCallback(() => {
    setWelcomeTabOpen(true);
  }, []);

  const cursorPosition = useMemo(
    () => ({ cursorLine: editorModel.cursorLine, cursorColumn: editorModel.cursorColumn }),
    [editorModel.cursorLine, editorModel.cursorColumn],
  );

  const renderWordCount = previewModel.renderResult?.metadata.word_count;
  const { wordCount, charCount, selectionCount } = useMemo(() => {
    const { text } = editorModel;

    return {
      wordCount: deriveWordCount(text, renderWordCount),
      charCount: text.length,
      selectionCount: editorModel.selectionFrom !== null && editorModel.selectionTo !== null
        ? editorModel.selectionTo - editorModel.selectionFrom
        : undefined,
    };
  }, [editorModel.selectionFrom, editorModel.selectionTo, editorModel.text, renderWordCount]);

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

  useEffect(() => {
    setStyleMatches([]);
    setStyleSelection(null);
  }, [activeTab?.id]);

  useEffect(() => {
    if (!editorPresentation.styleCheckSettings.enabled) {
      setStyleMatches([]);
    }
  }, [editorPresentation.styleCheckSettings.enabled]);

  useDocumentSessionEffects({
    isSidebarLoading,
    isSessionHydrated,
    locations,
    selectedLocationId,
    tabs,
    activeTab,
    documentsCount: documents.length,
    activeDocRef,
    openDoc,
    handleSelectDocument,
  });

  useEditorPreviewEffects({
    activeTab,
    text: editorModel.text,
    saveStatus: editorModel.saveStatus,
    markActiveTabModified,
    setPreviewDoc,
    renderPreview,
  });

  useSettingsSync();

  const handleStyleMatchesChange = useCallback((matches: StyleMatch[]) => {
    setStyleMatches(matches);
  }, []);

  const handleSelectStyleMatch = useCallback((match: StyleMatch) => {
    setStyleSelection((previous) => ({ from: match.from, to: match.to, requestId: (previous?.requestId ?? 0) + 1 }));
  }, []);

  const toolbarProps = useMemo(
    () => ({
      saveStatus: editorModel.saveStatus,
      atProtoSession: atProto.session,
      hasActiveDocument: hasEditableDocument,
      onSave: handleSave,
      onAtProtoAuth: atProto.openAuthSheet,
      onNewDocument: handleNewDocument,
      isNewDocumentDisabled: !hasLocations,
      onExportPdf: handleOpenPdfExport,
      isPdfExportDisabled: !activeTab || isImageDocument,
      onInsertImage: hasEditableDocument ? handlePickAndInsertImage : undefined,
      onRefresh: handleRefreshSidebar,
    }),
    [
      editorModel.saveStatus,
      atProto.openAuthSheet,
      atProto.session,
      activeTab,
      handleOpenPdfExport,
      handleNewDocument,
      handleRefreshSidebar,
      hasLocations,
      handleSave,
      hasEditableDocument,
      isImageDocument,
      handlePickAndInsertImage,
    ],
  );

  const editorProps = useMemo(
    () => ({
      initialText: editorModel.text,
      onChange: handleEditorChange,
      onSave: handleSave,
      onCursorMove: handleCursorMove,
      onSelectionChange: handleSelectionChange,
      onStyleMatchesChange: handleStyleMatchesChange,
      styleSelection,
      imageHandlers: { insertAt, onImageFilePaste: handleImageFilePaste },
    }),
    [
      editorModel.text,
      handleEditorChange,
      handleSave,
      handleCursorMove,
      handleSelectionChange,
      handleStyleMatchesChange,
      styleSelection,
      insertAt,
      handleImageFilePaste,
    ],
  );

  const statusBarProps = useMemo(() => ({ docMeta: activeDocMeta, stats: editorStats }), [activeDocMeta, editorStats]);

  const previewProps = useMemo(
    () => ({
      renderResult: previewModel.renderResult,
      theme: editorPresentation.theme,
      editorLine: editorModel.cursorLine,
      previewStyle: editorPresentation.markdownPreviewStyle,
      renderedFontFamily: editorPresentation.renderedFontFamily,
      locationId: previewModel.docRef?.location_id,
      docRelPath: previewModel.docRef?.rel_path,
      blobDid: atProto.session?.did,
      onScrollToLine: syncPreviewLine,
    }),
    [
      previewModel.renderResult,
      previewModel.docRef?.location_id,
      previewModel.docRef?.rel_path,
      atProto.session?.did,
      editorPresentation.theme,
      editorPresentation.markdownPreviewStyle,
      editorPresentation.renderedFontFamily,
      editorModel.cursorLine,
      syncPreviewLine,
    ],
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
      saveStatus: editorModel.saveStatus,
      hasActiveDocument: hasEditableDocument,
      onSave: handleSave,
    }),
    [
      activeDocMeta,
      editorStats,
      editorModel.text,
      editorModel.saveStatus,
      hasEditableDocument,
      handleEditorChange,
      handleSave,
      handleCursorMove,
      handleSelectionChange,
    ],
  );

  const welcomeProps = useMemo<WorkspaceWelcomeProps>(
    () => ({
      isVisible: showWelcomeScreen,
      hasLocations,
      locationCount: locations.length,
      documentCount: openLocationDocumentCount,
      onAddLocation: handleAddLocation,
    }),
    [showWelcomeScreen, hasLocations, locations.length, openLocationDocumentCount, handleAddLocation],
  );

  const workspacePanelProps = useMemo(
    () => ({
      toolbar: toolbarProps,
      onOpenWelcomeTab: handleOpenWelcomeTab,
      onOpenImportSheet: atProto.openImportSheet,
      onOpenGithubImportSheet: atProto.openGithubImportSheet,
      onOpenStandardSiteImportSheet: standardSite.openImportSheet,
      editor: editorProps,
      preview: previewProps,
      statusBar: statusBarProps,
      diagnostics: {
        isVisible: diagnosticsVisible,
        styleCheckEnabled: editorPresentation.styleCheckSettings.enabled,
        matches: styleMatches,
        onSelectMatch: handleSelectStyleMatch,
        onClose: closeDiagnostics,
        onOpenSettings: openSettingsRoute,
      },
      welcome: welcomeProps,
      activeDocRelPath: editorModel.docRef?.rel_path,
      activeDocContentType: editorModel.contentType,
    }),
    [
      toolbarProps,
      handleOpenWelcomeTab,
      atProto.openImportSheet,
      atProto.openGithubImportSheet,
      standardSite.openImportSheet,
      editorProps,
      previewProps,
      statusBarProps,
      diagnosticsVisible,
      editorPresentation.styleCheckSettings.enabled,
      styleMatches,
      handleSelectStyleMatch,
      closeDiagnostics,
      openSettingsRoute,
      welcomeProps,
      editorModel.docRef?.rel_path,
      editorModel.contentType,
    ],
  );

  return {
    workspacePanelProps,
    focusModePanelProps,
    handleExportPdf,
    previewResult,
    activeDocLocationId,
    activeDocRelPath,
    editorFontFamily: editorPresentation.fontFamily,
    renderedFontFamily: editorPresentation.renderedFontFamily,
    editorText: editorModel.text,
    atProto,
    standardSite,
  };
}
