import type { SidebarRefreshReason } from "$state/types";
import type { DocRef, SaveStatus, Tab } from "$types";
import { useEffect, useRef } from "react";

type UseEditorPreviewEffectsArgs = {
  activeTab: Tab | null;
  text: string;
  saveStatus: SaveStatus;
  markActiveTabModified: (isModified: boolean) => void;
  setPreviewDoc: (docRef: DocRef | null) => void;
  renderPreview: (docRef: DocRef, text: string) => void;
  handleRefreshSidebar: (locationId?: number, options?: { source?: SidebarRefreshReason }) => void;
};

export function useEditorPreviewEffects(
  { activeTab, text, saveStatus, markActiveTabModified, setPreviewDoc, renderPreview, handleRefreshSidebar }:
    UseEditorPreviewEffectsArgs,
): void {
  const previousSaveStatusRef = useRef(saveStatus);

  useEffect(() => {
    markActiveTabModified(saveStatus === "Dirty");
  }, [saveStatus, markActiveTabModified]);

  useEffect(() => {
    const previousSaveStatus = previousSaveStatusRef.current;
    if (previousSaveStatus === "Saving" && saveStatus === "Saved") {
      handleRefreshSidebar(activeTab?.docRef.location_id, { source: "save" });
    }

    previousSaveStatusRef.current = saveStatus;
  }, [activeTab, saveStatus, handleRefreshSidebar]);

  useEffect(() => {
    if (activeTab) {
      setPreviewDoc(activeTab.docRef);
    } else {
      setPreviewDoc(null);
    }
  }, [activeTab, setPreviewDoc]);

  useEffect(() => {
    if (!activeTab) {
      return;
    }

    const timeoutId = setTimeout(() => {
      renderPreview(activeTab.docRef, text);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [activeTab, text, renderPreview]);
}
