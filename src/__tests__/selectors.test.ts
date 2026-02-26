import { useEditorPresentationState } from "$state/selectors";
import { useEditorPresentationActions, useViewModeActions } from "$state/selectors";
import { resetAppStore } from "$state/stores/app";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

describe("selectors", () => {
  beforeEach(() => {
    resetAppStore();
  });

  it("hides line numbers while focus mode is enabled", () => {
    const { result: presentation } = renderHook(() => useEditorPresentationState());
    const { result: viewModeActions } = renderHook(() => useViewModeActions());
    const { result: editorActions } = renderHook(() => useEditorPresentationActions());

    act(() => {
      editorActions.current.setLineNumbersVisible(true);
    });
    expect(presentation.current.showLineNumbers).toBeTruthy();

    act(() => {
      viewModeActions.current.setFocusMode(true);
    });
    expect(presentation.current.showLineNumbers).toBeFalsy();

    act(() => {
      viewModeActions.current.setFocusMode(false);
    });
    expect(presentation.current.showLineNumbers).toBeTruthy();
  });
});
