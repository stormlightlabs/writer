import type { MarginSide, Orientation, PageSize, PdfExportOptions } from "$pdf/types";
import type {
  AppTheme,
  DocMeta,
  EditorFontFamily,
  FocusDimmingMode,
  FocusModeSettings,
  GlobalCaptureSettings,
  LocationDescriptor,
  PatternCategory,
  SearchHit,
  SessionState,
  StyleCheckPattern,
  StyleCheckSettings,
  Tab,
} from "$types";

export type SearchFilters = { locations?: number[]; fileTypes?: string[]; dateRange?: { from?: Date; to?: Date } };

export type LayoutChromeState = {
  sidebarCollapsed: boolean;
  topBarsCollapsed: boolean;
  statusBarCollapsed: boolean;
  showSearch: boolean;
  reduceMotion: boolean;
  showFilenames: boolean;
  createReadmeInNewLocations: boolean;
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
  setReduceMotion: (value: boolean) => void;
  setFilenameVisibility: (value: boolean) => void;
  toggleFilenameVisibility: () => void;
  setCreateReadmeInNewLocations: (value: boolean) => void;
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
  setEditorOnlyMode: () => void;
  setFocusMode: (value: boolean) => void;
  toggleFocusMode: () => void;
  setFocusModeSettings: (settings: FocusModeSettings) => void;
  setTypewriterScrollingEnabled: (enabled: boolean) => void;
  setFocusDimmingMode: (mode: FocusDimmingMode) => void;
  setAutoEnterFocusMode: (enabled: boolean) => void;
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

export type SidebarRefreshReason = "manual" | "save" | "external";

export type WorkspaceDocumentsState = {
  selectedDocPath?: string;
  documents: DocMeta[];
  isLoadingDocuments: boolean;
  refreshingLocationId?: number;
  sidebarRefreshReason: SidebarRefreshReason | null;
};

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
  setSidebarRefreshState: (locationId?: number, reason?: SidebarRefreshReason | null) => void;
};

export type WorkspaceState = WorkspaceLocationsState & WorkspaceDocumentsState;

export type WorkspaceActions = WorkspaceLocationsActions & WorkspaceDocumentsActions;

export type TabsState = { tabs: Tab[]; activeTabId: string | null; isSessionHydrated: boolean };

export type TabsActions = { applySessionState: (session: SessionState) => void };

export type PdfExportState = { isExportingPdf: boolean; pdfExportError: string | null };

export type PdfExportActions = {
  startPdfExport: () => void;
  finishPdfExport: () => void;
  failPdfExport: (message: string) => void;
  resetPdfExport: () => void;
};

export type SearchState = {
  searchQuery: string;
  searchResults: SearchHit[];
  isSearching: boolean;
  searchFilters: SearchFilters;
};

export type SearchActions = {
  setSearchQuery: (value: string) => void;
  setSearchResults: (value: SearchHit[]) => void;
  setIsSearching: (value: boolean) => void;
  setSearchFilters: (value: SearchFilters) => void;
  resetSearch: () => void;
};

export type UiState = {
  layoutSettingsOpen: boolean;
  pdfExportDialogOpen: boolean;
  pdfExportOptions: PdfExportOptions;
  globalCaptureSettings: GlobalCaptureSettings;
  helpSheetOpen: boolean;
  styleDiagnosticsOpen: boolean;
};

export type UiActions = {
  setLayoutSettingsOpen: (value: boolean) => void;
  setPdfExportDialogOpen: (value: boolean) => void;
  setPdfExportOptions: (value: PdfExportOptions) => void;
  resetPdfExportOptions: () => void;
  setPdfPageSize: (value: PageSize) => void;
  setPdfOrientation: (value: Orientation) => void;
  setPdfFontSize: (value: number) => void;
  setPdfMargin: (side: MarginSide, value: number) => void;
  setPdfIncludeHeader: (value: boolean) => void;
  setPdfIncludeFooter: (value: boolean) => void;
  setGlobalCaptureSettings: (value: GlobalCaptureSettings) => void;
  setQuickCaptureEnabled: (enabled: boolean) => Promise<void>;
  setHelpSheetOpen: (value: boolean) => void;
  toggleHelpSheet: () => void;
  setStyleDiagnosticsOpen: (value: boolean) => void;
  toggleStyleDiagnostics: () => void;
};

export type AppStore =
  & LayoutState
  & LayoutActions
  & WorkspaceState
  & WorkspaceActions
  & TabsState
  & TabsActions
  & PdfExportState
  & PdfExportActions
  & SearchState
  & SearchActions
  & UiState
  & UiActions;

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
