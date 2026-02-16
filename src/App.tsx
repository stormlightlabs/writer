import { useCallback, useEffect, useState } from "react";
import { DocumentTabs, type Tab } from "./components/DocumentTabs";
import { Editor } from "./components/Editor";
import { FocusIcon, LibraryIcon, SearchIcon } from "./components/icons";
import { type SearchHit, SearchPanel } from "./components/SearchPanel";
import { Sidebar } from "./components/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { Toolbar } from "./components/Toolbar";
import { useBackendEvents } from "./hooks/useBackendEvents";
import { useEditor } from "./hooks/useEditor";
import { docList, locationAddViaDialog, locationList, locationRemove, runCmd } from "./ports";
import type { DocMeta, DocRef, LocationDescriptor } from "./ports";
import "./App.css";

let nextTabId = 1;

function generateTabId(): string {
  return `tab-${nextTabId++}`;
}

function App() {
  const { model: editorModel, dispatch: editorDispatch, openDoc } = useEditor();

  const { missingLocations, conflicts } = useBackendEvents();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [theme] = useState<"dark" | "light">("dark");

  const [locations, setLocations] = useState<LocationDescriptor[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>();
  const [selectedDocPath, setSelectedDocPath] = useState<string | undefined>();
  const [documents, setDocuments] = useState<DocMeta[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [sidebarFilter, setSidebarFilter] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFilters, setSearchFilters] = useState<
    { locations?: number[]; fileTypes?: string[]; dateRange?: { from?: Date; to?: Date } }
  >({});

  useEffect(() => {
    setIsLoadingLocations(true);
    runCmd(locationList((locs) => {
      setLocations(locs);
      setIsLoadingLocations(false);
      if (locs.length > 0 && !selectedLocationId) {
        setSelectedLocationId(locs[0].id);
      }
    }, (err) => {
      console.error("Failed to load locations:", err);
      setIsLoadingLocations(false);
    }));
  }, []);

  useEffect(() => {
    if (selectedLocationId) {
      setIsLoadingDocuments(true);
      runCmd(docList(selectedLocationId, (docs) => {
        setDocuments(docs);
        setIsLoadingDocuments(false);
      }, (err) => {
        console.error("Failed to load documents:", err);
        setIsLoadingDocuments(false);
      }));
    } else {
      setDocuments([]);
    }
  }, [selectedLocationId]);

  useEffect(() => {
    if (activeTabId) {
      setTabs((prev) =>
        prev.map((tab) => tab.id === activeTabId ? { ...tab, isModified: editorModel.saveStatus === "Dirty" } : tab)
      );
    }
  }, [editorModel.saveStatus, activeTabId]);

  const locationDocuments = selectedLocationId ? documents.filter((d) => d.location_id === selectedLocationId) : [];

  const text = editorModel.text;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;
  const selectionCount = editorModel.selectionFrom !== null && editorModel.selectionTo !== null
    ? (editorModel.selectionTo ?? 0) - (editorModel.selectionFrom ?? 0)
    : undefined;

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeDocMeta = activeTab
    ? documents.find((d) => d.location_id === activeTab.docRef.location_id && d.rel_path === activeTab.docRef.rel_path)
    : null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "F") {
        e.preventDefault();
        setShowSearch((prev) => !prev);
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "f" && !e.shiftKey) {
        e.preventDefault();
        setIsFocusMode((prev) => !prev);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        setSidebarCollapsed((prev) => !prev);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
        e.preventDefault();
        setIsSplitView((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleAddLocation = useCallback(() => {
    runCmd(locationAddViaDialog((location) => {
      setLocations((prev) => [...prev, location]);
      setSelectedLocationId(location.id);
    }, (err) => {
      console.error("Failed to add location:", err);
    }));
  }, []);

  const handleRemoveLocation = useCallback((locationId: number) => {
    runCmd(locationRemove(locationId, (removed) => {
      if (removed) {
        setLocations((prev) => prev.filter((l) => l.id !== locationId));
        if (selectedLocationId === locationId) {
          setSelectedLocationId(undefined);
          setSelectedDocPath(undefined);
          setTabs((prev) => prev.filter((t) => t.docRef.location_id !== locationId));
          if (activeTabId && tabs.find((t) => t.id === activeTabId)?.docRef.location_id === locationId) {
            setActiveTabId(null);
          }
        }
      }
    }, (err) => {
      console.error("Failed to remove location:", err);
    }));
  }, [selectedLocationId, activeTabId, tabs]);

  const handleSelectLocation = useCallback((locationId: number) => {
    setSelectedLocationId(locationId);
    setSelectedDocPath(undefined);
  }, []);

  const handleSelectDocument = useCallback((locationId: number, path: string) => {
    setSelectedDocPath(path);

    const existingTab = tabs.find((t) => t.docRef.location_id === locationId && t.docRef.rel_path === path);

    if (existingTab) {
      setActiveTabId(existingTab.id);
    } else {
      const docRef: DocRef = { location_id: locationId, rel_path: path };
      openDoc(docRef);

      const doc = documents.find((d) => d.location_id === locationId && d.rel_path === path);
      const newTab: Tab = {
        id: generateTabId(),
        docRef,
        title: doc?.title || path.split("/").pop() || "Untitled",
        isModified: false,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }
  }, [tabs, documents, openDoc]);

  const handleSelectTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      setSelectedLocationId(tab.docRef.location_id);
      setSelectedDocPath(tab.docRef.rel_path);
      openDoc(tab.docRef);
    }
  }, [tabs, openDoc]);

  const handleCloseTab = useCallback((tabId: string) => {
    const tabIndex = tabs.findIndex((t) => t.id === tabId);
    const newTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(newTabs);

    if (activeTabId === tabId) {
      if (newTabs.length > 0) {
        const newIndex = Math.min(tabIndex, newTabs.length - 1);
        const newActiveTab = newTabs[newIndex];
        setActiveTabId(newActiveTab.id);
        setSelectedLocationId(newActiveTab.docRef.location_id);
        setSelectedDocPath(newActiveTab.docRef.rel_path);

        openDoc(newActiveTab.docRef);
      } else {
        setActiveTabId(null);
        setSelectedDocPath(undefined);
      }
    }
  }, [tabs, activeTabId, openDoc]);

  const handleReorderTabs = useCallback((newTabs: Tab[]) => {
    setTabs(newTabs);
  }, []);

  const handleSave = useCallback(() => {
    editorDispatch({ type: "SaveRequested" });
  }, [editorDispatch]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    // TODO: Implement when backend has FTS
    setTimeout(() => {
      const results: SearchHit[] = documents.filter((d) => {
        if (searchFilters.locations?.length) {
          return searchFilters.locations.includes(d.location_id);
        }
        return true;
      }).filter((d) => d.title.toLowerCase().includes(query.toLowerCase())).map((d) => ({
        location_id: d.location_id,
        rel_path: d.rel_path,
        title: d.title,
        snippet: `Document matching "${query}"`,
        line: 1,
        column: 1,
        matches: [{ start: 0, end: query.length }],
      }));

      setSearchResults(results);
      setIsSearching(false);
    }, 100);
  }, [documents, searchFilters]);

  const handleSelectSearchResult = useCallback((hit: SearchHit) => {
    handleSelectDocument(hit.location_id, hit.rel_path);
    setShowSearch(false);
  }, [handleSelectDocument]);

  const handleOpenSettings = useCallback(() => {
    console.log("Open settings");
  }, []);

  if (isFocusMode) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-bg-primary">
        {/* Focus mode header */}
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="m-0 text-sm font-medium text-text-secondary flex items-center gap-2">
            <FocusIcon size={16} />
            Focus Mode
          </h1>
          <button
            onClick={() => setIsFocusMode(false)}
            className="px-4 py-2 bg-layer-01 border border-border-subtle rounded-md text-text-secondary text-[0.8125rem] cursor-pointer">
            Exit Focus Mode (Esc)
          </button>
        </div>

        {/* Focus mode editor */}
        <div className="flex-1 max-w-3xl mx-auto w-full">
          <Editor
            initialText={editorModel.text}
            theme={theme}
            onChange={(text) => editorDispatch({ type: "EditorChanged", text })}
            onSave={handleSave}
            onCursorMove={(line, column) => editorDispatch({ type: "CursorMoved", line, column })}
            onSelectionChange={(from, to) => editorDispatch({ type: "SelectionChanged", from, to })} />
        </div>

        {/* Focus mode status */}
        <StatusBar
          docMeta={activeDocMeta}
          cursorLine={editorModel.cursorLine}
          cursorColumn={editorModel.cursorColumn}
          wordCount={wordCount}
          charCount={charCount}
          selectionCount={selectionCount} />
      </div>
    );
  }

  return (
    <div data-theme={theme} className="h-screen flex flex-col bg-bg-primary text-text-primary font-sans">
      {/* App Header */}
      <header className="h-[48px] bg-layer-01 border-b border-border-subtle flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-8 h-8 flex items-center justify-center bg-transparent border-none text-icon-secondary cursor-pointer rounded"
            title="Toggle sidebar (Ctrl+B)">
            <LibraryIcon size={18} />
          </button>
          <h1 className="m-0 text-[0.9375rem] font-semibold text-text-primary">Writer</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-field-01 border border-border-subtle rounded text-text-secondary text-[0.8125rem] cursor-pointer">
            <SearchIcon size={14} />
            Search
            <kbd className="px-1.5 py-0.5 bg-layer-02 rounded text-xs font-mono">Ctrl+Shift+F</kbd>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {!sidebarCollapsed && (
          <Sidebar
            locations={locations}
            selectedLocationId={selectedLocationId}
            selectedDocPath={selectedDocPath}
            documents={locationDocuments}
            isCollapsed={false}
            isLoading={isLoadingLocations || isLoadingDocuments}
            onAddLocation={handleAddLocation}
            onRemoveLocation={handleRemoveLocation}
            onSelectLocation={handleSelectLocation}
            onSelectDocument={handleSelectDocument}
            filterText={sidebarFilter}
            onFilterChange={setSidebarFilter} />
        )}

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Toolbar
            saveStatus={editorModel.saveStatus}
            isSplitView={isSplitView}
            isFocusMode={isFocusMode}
            isPreviewVisible={isPreviewVisible}
            onSave={handleSave}
            onToggleSplitView={() => setIsSplitView(!isSplitView)}
            onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
            onTogglePreview={() => setIsPreviewVisible(!isPreviewVisible)}
            onOpenSettings={handleOpenSettings} />

          <DocumentTabs
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={handleSelectTab}
            onCloseTab={handleCloseTab}
            onReorderTabs={handleReorderTabs} />

          {/* Editor Split View */}
          <div className="flex-1 flex overflow-hidden">
            {/* Editor Pane */}
            <div className={`flex flex-col min-w-0 ${isSplitView && isPreviewVisible ? "flex-1 w-1/2" : "w-full"}`}>
              <Editor
                initialText={editorModel.text}
                theme={theme}
                onChange={(text) => editorDispatch({ type: "EditorChanged", text })}
                onSave={handleSave}
                onCursorMove={(line, column) => editorDispatch({ type: "CursorMoved", line, column })}
                onSelectionChange={(from, to) => editorDispatch({ type: "SelectionChanged", from, to })} />
            </div>

            {isSplitView && isPreviewVisible && (
              <div className="flex-1 w-1/2 min-w-0 border-l border-border-subtle bg-layer-01 p-6 overflow-auto">
                <div className="max-w-[700px] mx-auto text-text-secondary text-sm text-center pt-10">
                  Preview will appear here
                  <br />
                  <span className="opacity-60">Markdown rendering coming soon</span>
                </div>
              </div>
            )}
          </div>

          <StatusBar
            docMeta={activeDocMeta}
            cursorLine={editorModel.cursorLine}
            cursorColumn={editorModel.cursorColumn}
            wordCount={wordCount}
            charCount={charCount}
            selectionCount={selectionCount} />
        </div>
      </div>

      {showSearch && (
        <SearchPanel
          query={searchQuery}
          results={searchResults}
          isSearching={isSearching}
          locations={locations.map((l) => ({ id: l.id, name: l.name }))}
          filters={searchFilters}
          onQueryChange={handleSearch}
          onFiltersChange={setSearchFilters}
          onSelectResult={handleSelectSearchResult}
          onClose={() => setShowSearch(false)} />
      )}

      {missingLocations.length > 0 && (
        <div className="fixed bottom-8 right-8 bg-support-error text-white px-4 py-3 rounded-md shadow-xl z-50 max-w-[400px]">
          <strong>Missing Locations</strong>
          <p className="mt-1 text-[0.8125rem]">
            {missingLocations.length} location(s) could not be found. They may have been moved or deleted.
          </p>
        </div>
      )}

      {conflicts.length > 0 && (
        <div
          className={`fixed right-8 bg-accent-yellow text-bg-primary px-4 py-3 rounded-md shadow-xl z-50 max-w-[400px] ${
            missingLocations.length > 0 ? "bottom-[120px]" : "bottom-8"
          }`}>
          <strong>Conflicts Detected</strong>
          <p className="mt-1 text-[0.8125rem]">{conflicts.length} file(s) have conflicts that need attention.</p>
        </div>
      )}
    </div>
  );
}

export default App;
