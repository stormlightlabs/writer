import { useCallback } from "react";
import { AppHeaderBar } from "./components/AppLayout/AppHeaderBar";
import { BackendAlerts } from "./components/AppLayout/BackendAlerts";
import { FocusModePanel } from "./components/AppLayout/FocusModePanel";
import { LayoutSettingsPanel, RoutedSettingsSheet } from "./components/AppLayout/LayoutSettingsPanel";
import { SearchOverlay } from "./components/AppLayout/SearchOverlay";
import { WorkspacePanel } from "./components/AppLayout/WorkspacePanel";
import { ExportDialog } from "./components/export/ExportDialog/ExportDialog";
import { HelpSheet } from "./components/HelpSheet";
import { Toaster } from "./components/Toaster";
import { useAppChromeController } from "./hooks/controllers/useAppChromeController";
import { useWorkspaceViewController } from "./hooks/controllers/useWorkspaceViewController";
import { useHelpSheetState } from "./state/selectors";

const AppContent = ({ isFocusMode }: { isFocusMode: boolean }) => {
  const { workspacePanelProps, focusModePanelProps, handleExportPdf, previewResult, editorFontFamily, editorText } =
    useWorkspaceViewController();
  const { isOpen: isHelpSheetOpen, setOpen: setHelpSheetOpen } = useHelpSheetState();
  const closeHelpSheet = useCallback(() => setHelpSheetOpen(false), [setHelpSheetOpen]);

  if (isFocusMode) {
    return (
      <>
        <FocusModePanel {...focusModePanelProps} />
        <HelpSheet isOpen={isHelpSheetOpen} onClose={closeHelpSheet} />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <WorkspacePanel {...workspacePanelProps} />
      <LayoutSettingsPanel />
      <ExportDialog
        onExport={handleExportPdf}
        previewResult={previewResult}
        editorFontFamily={editorFontFamily}
        documentText={editorText} />
      <SearchOverlay />
      <BackendAlerts />
      <HelpSheet isOpen={isHelpSheetOpen} onClose={closeHelpSheet} />
      <Toaster />
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
