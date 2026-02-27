import { useCallback } from "react";
import { HelpSheet } from "./components/HelpSheet";
import { AppHeaderBar } from "./components/layout/AppHeaderBar";
import { BackendAlerts } from "./components/layout/BackendAlerts";
import { FocusModePanel } from "./components/layout/FocusModePanel";
import { LayoutSettingsPanel, RoutedSettingsSheet } from "./components/layout/LayoutSettingsPanel";
import { SearchOverlay } from "./components/layout/SearchOverlay";
import { WorkspacePanel } from "./components/layout/WorkspacePanel";
import { PdfExportDialog } from "./components/pdf/ExportDialog/ExportDialog";
import { useAppChromeController } from "./hooks/controllers/useAppChromeController";
import { useWorkspaceViewController } from "./hooks/controllers/useWorkspaceViewController";
import { useHelpSheetState } from "./state/selectors";

const AppContent = ({ isFocusMode }: { isFocusMode: boolean }) => {
  const { workspacePanelProps, focusModePanelProps, handleExportPdf, previewResult, editorFontFamily } =
    useWorkspaceViewController();
  const { isOpen: isHelpSheetOpen, setOpen: setHelpSheetOpen } = useHelpSheetState();
  const closeHelpSheet = useCallback(() => setHelpSheetOpen(false), [setHelpSheetOpen]);

  if (isFocusMode) {
    return (
      <>
        <FocusModePanel {...focusModePanelProps} />
        <HelpSheet isOpen={isHelpSheetOpen} onClose={closeHelpSheet} />
      </>
    );
  }

  return (
    <>
      <WorkspacePanel {...workspacePanelProps} />
      <LayoutSettingsPanel />
      <PdfExportDialog onExport={handleExportPdf} previewResult={previewResult} editorFontFamily={editorFontFamily} />
      <SearchOverlay />
      <BackendAlerts />
      <HelpSheet isOpen={isHelpSheetOpen} onClose={closeHelpSheet} />
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
      <RoutedSettingsSheet />
    </div>
  );
}

export default App;
