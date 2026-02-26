import { Button } from "$components/Button";
import { AppHeaderBar } from "./components/layout/AppHeaderBar";
import { BackendAlerts } from "./components/layout/BackendAlerts";
import { FocusModePanel } from "./components/layout/FocusModePanel";
import { LayoutSettingsPanel } from "./components/layout/LayoutSettingsPanel";
import { SearchOverlay } from "./components/layout/SearchOverlay";
import { WorkspacePanel } from "./components/layout/WorkspacePanel";
import { PdfExportDialog } from "./components/pdf/ExportDialog/ExportDialog";
import { useAppChromeController } from "./hooks/controllers/useAppChromeController";
import { useWorkspaceViewController } from "./hooks/controllers/useWorkspaceViewController";

const ShowButton = ({ clickHandler, title, label }: { clickHandler: () => void; title: string; label: string }) => (
  <Button
    onClick={clickHandler}
    className="px-2.5 py-1.5 bg-layer-01 border border-border-subtle rounded text-[0.75rem] text-text-secondary hover:text-text-primary cursor-pointer"
    title={title}>
    {label}
  </Button>
);

const AppContent = ({ isFocusMode }: { isFocusMode: boolean }) => {
  const { workspacePanelProps, focusModePanelProps, handleExportPdf } = useWorkspaceViewController();

  if (isFocusMode) {
    return <FocusModePanel {...focusModePanelProps} />;
  }

  return (
    <>
      <WorkspacePanel {...workspacePanelProps} />
      <LayoutSettingsPanel />
      <PdfExportDialog onExport={handleExportPdf} />
      <SearchOverlay />
      <BackendAlerts />
    </>
  );
};

function App() {
  const { theme, isFocusMode, isSidebarCollapsed, showToggleControls, handleShowSidebar } = useAppChromeController();

  return (
    <div
      data-theme={theme}
      className="relative h-screen overflow-hidden flex flex-col bg-bg-primary text-text-primary font-sans">
      {!isFocusMode && showToggleControls && (
        <div className="absolute left-3 top-3 z-50 flex items-center gap-2">
          {isSidebarCollapsed && (
            <ShowButton clickHandler={handleShowSidebar} title="Show sidebar (Ctrl+B)" label="Show Sidebar" />
          )}
        </div>
      )}

      {isFocusMode ? null : <AppHeaderBar />}
      <AppContent isFocusMode={isFocusMode} />
    </div>
  );
}

export default App;
