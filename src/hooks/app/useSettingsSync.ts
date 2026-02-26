import { logger } from "$logger";
import { globalCaptureGet, runCmd, styleCheckGet, styleCheckSet, uiLayoutGet, uiLayoutSet } from "$ports";
import { stateToLayoutSettings, uiSettingsToCalmUI, uiSettingsToFocusMode } from "$state/helpers";
import {
  useEditorPresentationStateRaw,
  useLayoutChromeState,
  useViewModeState,
  useWriterToolsState,
} from "$state/selectors";
import { useLayoutStore } from "$state/stores/layout";
import { useUiStore } from "$state/stores/ui";
import { useEffect, useState } from "react";

export function useSettingsSync(): void {
  const layoutChrome = useLayoutChromeState();
  const editorPresentation = useEditorPresentationStateRaw();
  const { focusModeSettings } = useViewModeState();
  const { styleCheckSettings } = useWriterToolsState();
  const [layoutSettingsHydrated, setLayoutSettingsHydrated] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    void runCmd(uiLayoutGet((settings) => {
      if (isCancelled) {
        return;
      }

      const state = useLayoutStore.getState();
      state.setSidebarCollapsed(settings.sidebar_collapsed);
      state.setTopBarsCollapsed(settings.top_bars_collapsed);
      state.setStatusBarCollapsed(settings.status_bar_collapsed);
      state.setReduceMotion(settings.reduce_motion);
      state.setLineNumbersVisible(settings.line_numbers_visible);
      state.setTextWrappingEnabled(settings.text_wrapping_enabled);
      state.setSyntaxHighlightingEnabled(settings.syntax_highlighting_enabled);
      state.setEditorFontSize(settings.editor_font_size);
      state.setEditorFontFamily(settings.editor_font_family);
      state.setCalmUiSettings(uiSettingsToCalmUI(settings));
      state.setFocusModeSettings(uiSettingsToFocusMode(settings));
      setLayoutSettingsHydrated(true);
    }, () => {
      if (!isCancelled) {
        setLayoutSettingsHydrated(true);
      }
    }));

    void runCmd(styleCheckGet((settings) => {
      if (isCancelled) {
        return;
      }

      useLayoutStore.getState().setStyleCheckSettings({
        enabled: settings.enabled,
        categories: settings.categories,
        customPatterns: settings.custom_patterns,
      });
    }, () => {}));

    void runCmd(globalCaptureGet((settings) => {
      if (isCancelled) {
        return;
      }

      useUiStore.getState().setGlobalCaptureSettings(settings);
    }, (error) => {
      logger.error("Failed to load global capture settings", error);
    }));

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!layoutSettingsHydrated) {
      return;
    }

    void runCmd(
      uiLayoutSet(stateToLayoutSettings(layoutChrome, editorPresentation, focusModeSettings), () => {}, () => {}),
    );
  }, [layoutSettingsHydrated, layoutChrome, editorPresentation, focusModeSettings]);

  useEffect(() => {
    if (!layoutSettingsHydrated) {
      return;
    }

    void runCmd(
      styleCheckSet(
        {
          categories: styleCheckSettings.categories,
          enabled: styleCheckSettings.enabled,
          custom_patterns: styleCheckSettings.customPatterns,
        },
        () => {},
        () => {},
      ),
    );
  }, [layoutSettingsHydrated, styleCheckSettings]);
}
