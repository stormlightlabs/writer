import { Button } from "$components/Button";
import { AppHeaderBar } from "./components/layout/AppHeaderBar";
import { BackendAlerts } from "./components/layout/BackendAlerts";
import { FocusModePanel } from "./components/layout/FocusModePanel";
import { LayoutSettingsPanel } from "./components/layout/LayoutSettingsPanel";
import { SearchOverlay } from "./components/layout/SearchOverlay";
import { WorkspacePanel } from "./components/layout/WorkspacePanel";
import { PdfExportDialog } from "./components/pdf/ExportDialog/ExportDialog";
import { useAppController } from "./hooks/controllers/useAppController";

const ShowButton = ({ clickHandler, title, label }: { clickHandler: () => void; title: string; label: string }) => (
  <Button
    onClick={clickHandler}
    className="px-2.5 py-1.5 bg-layer-01 border border-border-subtle rounded text-[0.75rem] text-text-secondary hover:text-text-primary cursor-pointer"
    title={title}>
    {label}
  </Button>
);

function App() {
  const {
    theme,
    isFocusMode,
    isSidebarCollapsed,
    showToggleControls,
    workspacePanelProps,
    focusModePanelProps,
    handleShowSidebar,
    handleExportPdf,
  } = useAppController();

  if (isFocusMode) {
    return <FocusModePanel {...focusModePanelProps} />;
  }

  return (
    <div
      data-theme={theme}
      className="relative h-screen overflow-hidden flex flex-col bg-bg-primary text-text-primary font-sans">
      {showToggleControls && (
        <div className="absolute left-3 top-3 z-50 flex items-center gap-2">
          {isSidebarCollapsed && (
            <ShowButton clickHandler={handleShowSidebar} title="Show sidebar (Ctrl+B)" label="Show Sidebar" />
          )}
        </div>
      )}

      <AppHeaderBar />
      <WorkspacePanel {...workspacePanelProps} />
      <LayoutSettingsPanel />
      <PdfExportDialog onExport={handleExportPdf} />
      <SearchOverlay />
      <BackendAlerts />
    </div>
  );
}

export default App;
