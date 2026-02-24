import type {
  AppTheme,
  CalmUiSettings,
  DocMeta,
  DocRef,
  EditorFontFamily,
  FocusDimmingMode,
  FocusModeSettings,
  LocationDescriptor,
  PatternCategory,
  StyleCheckPattern,
  StyleCheckSettings,
  Tab,
} from "$types";

export type OpenDocumentTabResult = { tabId: string; didCreateTab: boolean };

export type LayoutChromeState = {
  sidebarCollapsed: boolean;
  topBarsCollapsed: boolean;
  statusBarCollapsed: boolean;
  showSearch: boolean;
  calmUiSettings: CalmUiSettings;
  chromeTemporarilyVisible: boolean;
};

export type EditorPresentationState = {
  lineNumbersVisible: boolean;
  textWrappingEnabled: boolean;
  syntaxHighlightingEnabled: boolean;
  editorFontSize: number;
  editorFontFamily: EditorFontFamily;
  theme: AppTheme;
};

export type ViewModeState = {
  isSplitView: boolean;
  isFocusMode: boolean;
  isPreviewVisible: boolean;
  focusModeSettings: FocusModeSettings;
};

export type WriterToolsState = { posHighlightingEnabled: boolean; styleCheckSettings: StyleCheckSettings };

export type LayoutChromeActions = {
  setSidebarCollapsed: (value: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setTopBarsCollapsed: (value: boolean) => void;
  toggleTabBarCollapsed: () => void;
  setStatusBarCollapsed: (value: boolean) => void;
  toggleStatusBarCollapsed: () => void;
  setShowSearch: (value: boolean) => void;
  toggleShowSearch: () => void;
  setCalmUiSettings: (settings: CalmUiSettings) => void;
  toggleCalmUi: () => void;
  setCalmUiAutoHide: (value: boolean) => void;
  setCalmUiFocusMode: (value: boolean) => void;
  setChromeTemporarilyVisible: (value: boolean) => void;
  revealChromeTemporarily: () => void;
};

export type EditorPresentationActions = {
  setLineNumbersVisible: (value: boolean) => void;
  toggleLineNumbersVisible: () => void;
  setTextWrappingEnabled: (value: boolean) => void;
  toggleTextWrappingEnabled: () => void;
  setSyntaxHighlightingEnabled: (value: boolean) => void;
  toggleSyntaxHighlightingEnabled: () => void;
  setEditorFontSize: (value: number) => void;
  setEditorFontFamily: (value: EditorFontFamily) => void;
};

export type ViewModeActions = {
  setSplitView: (value: boolean) => void;
  toggleSplitView: () => void;
  setFocusMode: (value: boolean) => void;
  toggleFocusMode: () => void;
  setFocusModeSettings: (settings: FocusModeSettings) => void;
  setTypewriterScrollingEnabled: (enabled: boolean) => void;
  setFocusDimmingMode: (mode: FocusDimmingMode) => void;
  toggleTypewriterScrolling: () => void;
  setPreviewVisible: (value: boolean) => void;
  togglePreviewVisible: () => void;
};

export type WriterToolsActions = {
  setPosHighlightingEnabled: (value: boolean) => void;
  togglePosHighlighting: () => void;
  setStyleCheckSettings: (settings: StyleCheckSettings) => void;
  toggleStyleCheck: () => void;
  setStyleCheckCategory: (category: PatternCategory, enabled: boolean) => void;
  addCustomPattern: (pattern: StyleCheckPattern) => void;
  removeCustomPattern: (index: number) => void;
};

export type LayoutState = LayoutChromeState & EditorPresentationState & ViewModeState & WriterToolsState;

export type LayoutActions = LayoutChromeActions & EditorPresentationActions & ViewModeActions & WriterToolsActions;

export type WorkspaceLocationsState = {
  locations: LocationDescriptor[];
  isLoadingLocations: boolean;
  selectedLocationId?: number;
  sidebarFilter: string;
};

export type WorkspaceDocumentsState = { selectedDocPath?: string; documents: DocMeta[]; isLoadingDocuments: boolean };

export type WorkspaceLocationsActions = {
  setSidebarFilter: (value: string) => void;
  setLocations: (locations: LocationDescriptor[]) => void;
  setLoadingLocations: (value: boolean) => void;
  setSelectedLocation: (locationId?: number) => void;
  addLocation: (location: LocationDescriptor) => void;
  removeLocation: (locationId: number) => void;
};

export type WorkspaceDocumentsActions = {
  setSelectedDocPath: (path?: string) => void;
  setDocuments: (documents: DocMeta[]) => void;
  setLoadingDocuments: (value: boolean) => void;
};

export type WorkspaceState = WorkspaceLocationsState & WorkspaceDocumentsState;

export type WorkspaceActions = WorkspaceLocationsActions & WorkspaceDocumentsActions;

export type TabsState = { tabs: Tab[]; activeTabId: string | null };

export type TabsActions = {
  openDocumentTab: (docRef: DocRef, title: string) => OpenDocumentTabResult;
  selectTab: (tabId: string) => DocRef | null;
  closeTab: (tabId: string) => DocRef | null;
  reorderTabs: (tabs: Tab[]) => void;
  markActiveTabModified: (isModified: boolean) => void;
};

export type PdfExportState = { isExportingPdf: boolean; pdfExportError: string | null };

export type PdfExportActions = {
  startPdfExport: () => void;
  finishPdfExport: () => void;
  failPdfExport: (message: string) => void;
  resetPdfExport: () => void;
};

export type AppStore =
  & LayoutState
  & LayoutActions
  & WorkspaceState
  & WorkspaceActions
  & TabsState
  & TabsActions
  & PdfExportState
  & PdfExportActions;

export type EditorPresentation = {
  theme: AppTheme;
  showLineNumbers: boolean;
  textWrappingEnabled: boolean;
  syntaxHighlightingEnabled: boolean;
  fontSize: number;
  fontFamily: EditorFontFamily;
  typewriterScrollingEnabled: boolean;
  focusDimmingMode: FocusDimmingMode;
  posHighlightingEnabled: boolean;
  styleCheckSettings: StyleCheckSettings;
};
