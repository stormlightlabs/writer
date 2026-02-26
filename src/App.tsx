import { AppHeaderBar } from "./components/layout/AppHeaderBar";
import { BackendAlerts } from "./components/layout/BackendAlerts";
import { FocusModePanel } from "./components/layout/FocusModePanel";
import { LayoutSettingsPanel } from "./components/layout/LayoutSettingsPanel";
import { SearchOverlay } from "./components/layout/SearchOverlay";
import { WorkspacePanel } from "./components/layout/WorkspacePanel";
import { PdfExportDialog } from "./components/pdf/ExportDialog/ExportDialog";
import { useAppChromeController } from "./hooks/controllers/useAppChromeController";
import { useWorkspaceViewController } from "./hooks/controllers/useWorkspaceViewController";

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
  const { theme, isFocusMode } = useAppChromeController();

  return (
    <div
      data-theme={theme}
      className="relative h-screen overflow-hidden flex flex-col bg-bg-primary text-text-primary font-sans">
      {isFocusMode ? null : <AppHeaderBar />}
      <AppContent isFocusMode={isFocusMode} />
    </div>
  );
}

export default App;
