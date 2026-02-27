import type { DocRef, SaveStatus, Tab } from "$types";
import { useEffect } from "react";

type UseEditorPreviewEffectsArgs = {
  activeTab: Tab | null;
  text: string;
  saveStatus: SaveStatus;
  markActiveTabModified: (isModified: boolean) => void;
  setPreviewDoc: (docRef: DocRef | null) => void;
  renderPreview: (docRef: DocRef, text: string) => void;
};

export function useEditorPreviewEffects(
  { activeTab, text, saveStatus, markActiveTabModified, setPreviewDoc, renderPreview }: UseEditorPreviewEffectsArgs,
): void {
  useEffect(() => {
    markActiveTabModified(saveStatus === "Dirty");
  }, [saveStatus, markActiveTabModified]);

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
