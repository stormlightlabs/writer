import { useCallback } from "react";
import { AppHeaderBar } from "./components/AppLayout/AppHeaderBar";
import { BackendAlerts } from "./components/AppLayout/BackendAlerts";
import { FocusModePanel } from "./components/AppLayout/FocusModePanel";
import { LayoutSettingsPanel, RoutedSettingsSheet } from "./components/AppLayout/LayoutSettingsPanel";
import { SearchOverlay } from "./components/AppLayout/SearchOverlay";
import { WorkspacePanel } from "./components/AppLayout/WorkspacePanel";
import { AtProtoAuthSheet } from "./components/AtProto/AtProtoAuthSheet";
import { ExportDialog } from "./components/export/ExportDialog/ExportDialog";
import { HelpSheet } from "./components/HelpSheet";
import { Toaster } from "./components/Toaster";
import { useAppChromeController } from "./hooks/controllers/useAppChromeController";
import {
  useWorkspaceViewController,
  type WorkspaceViewController,
} from "./hooks/controllers/useWorkspaceViewController";
import { useHelpSheetState } from "./state/selectors";

const AppContent = ({ isFocusMode, view }: { isFocusMode: boolean; view: WorkspaceViewController }) => {
  const {
    workspacePanelProps,
    focusModePanelProps,
    handleExportPdf,
    previewResult,
    editorFontFamily,
    editorText,
    atProto,
  } = view;
  const { isOpen: isHelpSheetOpen, setOpen: setHelpSheetOpen } = useHelpSheetState();
  const closeHelpSheet = useCallback(() => setHelpSheetOpen(false), [setHelpSheetOpen]);

  if (isFocusMode) {
    return (
      <>
        <FocusModePanel {...focusModePanelProps} />
        <AtProtoAuthSheet controller={atProto} />
        <HelpSheet isOpen={isHelpSheetOpen} onClose={closeHelpSheet} />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <WorkspacePanel {...workspacePanelProps} />
      <LayoutSettingsPanel
        atProtoSession={atProto.session}
        atProtoPending={atProto.isPending}
        onOpenAtProtoAuth={atProto.openAuthSheet}
        onLogoutAtProto={atProto.handleLogout} />
      <AtProtoAuthSheet controller={atProto} />
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
  const view = useWorkspaceViewController();
  const { atProto } = view;

  return (
    <div
      data-theme={theme}
      className="relative h-screen overflow-hidden flex flex-col bg-surface-primary text-text-primary font-sans">
      {isFocusMode ? null : <AppHeaderBar />}
      <AppContent isFocusMode={isFocusMode} view={view} />
      <RoutedSettingsSheet
        atProtoSession={atProto.session}
        atProtoPending={atProto.isPending}
        onOpenAtProtoAuth={atProto.openAuthSheet}
        onLogoutAtProto={atProto.handleLogout} />
    </div>
  );
}

export default App;
