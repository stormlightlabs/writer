import { CollapsibleSection } from "$components/CollapsibleSection";
import { Sheet, type SheetPosition, type SheetSize } from "$components/Sheet";
import { useRoutedSheet } from "$hooks/useRoutedSheet";
import { useViewportTier } from "$hooks/useViewportTier";
import { useLayoutSettingsUiState } from "$state/selectors";
import type { SettingsScope } from "$types";
import { cn } from "$utils/tw";
import { useCallback, useEffect, useMemo } from "react";
import { AccessibilitySection } from "./Accessibility";
import { ChromeSettingsSection } from "./ChromeSettings";
import { EditorSettingsSection } from "./EditorSettings";
import { FocusModeSection } from "./FocusModeSettings";
import { QuickCaptureSection } from "./QuickCapture";
import { SettingsHeader } from "./SettingsHeader";
import { WriterToolsSection } from "./WriterTools";

type SettingsSheetLayout = { position: SheetPosition; size: SheetSize; className: string; backdropClassName: string };

const SettingsBody = ({ scope }: { scope: SettingsScope }) => (
  <div
    className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", scope === "full" ? "space-y-3 pr-2" : "pr-1")}>
    <CollapsibleSection
      title="Accessibility"
      description="Configure motion and display preferences."
      className={cn(
        scope === "full" && "rounded-lg border border-border-subtle bg-layer-02/35 px-3.5 first:border-t shadow-sm",
      )}
      contentClassName={cn(scope === "full" && "pb-3")}>
      <AccessibilitySection />
    </CollapsibleSection>
    <CollapsibleSection
      title="Chrome"
      description="Control visibility of core app UI regions."
      defaultOpen
      className={cn(
        scope === "full" && "rounded-lg border border-border-subtle bg-layer-02/35 px-3.5 first:border-t shadow-sm",
      )}
      contentClassName={cn(scope === "full" && "pb-3")}>
      <ChromeSettingsSection />
    </CollapsibleSection>
    <CollapsibleSection
      title="Editor"
      description="Tune text presentation, wrapping, and typography."
      defaultOpen
      className={cn(
        scope === "full" && "rounded-lg border border-border-subtle bg-layer-02/35 px-3.5 first:border-t shadow-sm",
      )}
      contentClassName={cn(scope === "full" && "pb-3")}>
      <EditorSettingsSection />
    </CollapsibleSection>
    {scope === "full" && (
      <>
        <CollapsibleSection
          title="Focus Mode"
          description="Configure centered writing and dimming behavior."
          className="rounded-lg border border-border-subtle bg-layer-02/35 px-3.5 first:border-t shadow-sm"
          contentClassName="pb-3">
          <FocusModeSection />
        </CollapsibleSection>
        <CollapsibleSection
          title="Writer's Tools"
          description="Adjust writing analysis and guidance features."
          className="rounded-lg border border-border-subtle bg-layer-02/35 px-3.5 first:border-t shadow-sm"
          contentClassName="pb-3">
          <WriterToolsSection />
        </CollapsibleSection>
        <CollapsibleSection
          title="Quick Capture"
          description="Toggle global quick-note capture behavior."
          className="rounded-lg border border-border-subtle bg-layer-02/35 px-3.5 first:border-t shadow-sm"
          contentClassName="pb-3">
          <QuickCaptureSection />
        </CollapsibleSection>
      </>
    )}
  </div>
);

type SettingsContentProps = {
  title: string;
  scope: SettingsScope;
  onClose: () => void;
  closeAriaLabel: string;
  onViewMore?: () => void;
};

const SettingsContent = ({ title, scope, onClose, closeAriaLabel, onViewMore }: SettingsContentProps) => (
  <section className={cn("flex min-h-0 h-full flex-col overflow-hidden", scope === "full" ? "p-5 sm:p-6" : "p-4")}>
    <SettingsHeader
      title={title}
      scope={scope}
      onClose={onClose}
      closeAriaLabel={closeAriaLabel}
      onViewMore={onViewMore} />
    <SettingsBody scope={scope} />
  </section>
);

function useSettingsSheetLayout(scope: SettingsScope): SettingsSheetLayout {
  const { isCompact, viewportWidth } = useViewportTier();
  const compactPanel = useMemo(() => isCompact || viewportWidth < 920, [isCompact, viewportWidth]);

  return useMemo(() => {
    if (compactPanel) {
      return {
        position: "b",
        size: scope === "basic" ? "lg" : "full",
        className: scope === "basic"
          ? "left-3 right-3 bottom-3 rounded-xl border"
          : "left-2 right-2 top-2 bottom-2 rounded-2xl border shadow-2xl",
        backdropClassName: scope === "basic" ? "bg-black/35" : "bg-black/45",
      };
    }

    return {
      position: "r",
      size: scope === "basic" ? "md" : "xl",
      className: scope === "basic"
        ? "right-4 top-14 bottom-4 rounded-xl border"
        : "right-4 top-4 bottom-4 rounded-2xl border shadow-2xl",
      backdropClassName: scope === "basic" ? "bg-black/30" : "bg-black/40",
    };
  }, [compactPanel, scope]);
}

export function LayoutSettingsPanel() {
  const { isOpen: isVisible, setOpen } = useLayoutSettingsUiState();
  const { isOpen: isSettingsRouteOpen, open: openSettingsRoute } = useRoutedSheet("/settings");
  const layout = useSettingsSheetLayout("basic");

  useEffect(() => {
    if (isVisible && isSettingsRouteOpen) {
      setOpen(false);
    }
  }, [isSettingsRouteOpen, isVisible, setOpen]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const handleViewMore = useCallback(() => {
    setOpen(false);
    openSettingsRoute();
  }, [openSettingsRoute, setOpen]);

  return (
    <Sheet
      isOpen={isVisible}
      onClose={handleClose}
      position={layout.position}
      size={layout.size}
      ariaLabel="Layout settings"
      backdropClassName={layout.backdropClassName}
      className={layout.className}>
      <SettingsContent
        title="Layout Settings"
        scope="basic"
        onClose={handleClose}
        closeAriaLabel="Close layout settings"
        onViewMore={handleViewMore} />
    </Sheet>
  );
}

export function RoutedSettingsSheet() {
  const { isOpen, close } = useRoutedSheet("/settings");
  const layout = useSettingsSheetLayout("full");

  return (
    <Sheet
      isOpen={isOpen}
      onClose={close}
      position={layout.position}
      size={layout.size}
      ariaLabel="Settings"
      backdropClassName={layout.backdropClassName}
      className={layout.className}>
      <SettingsContent title="Settings" scope="full" onClose={close} closeAriaLabel="Close settings panel" />
    </Sheet>
  );
}
