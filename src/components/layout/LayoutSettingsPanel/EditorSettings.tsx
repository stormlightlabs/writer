import { useLayoutSettingsEditorState } from "$state/selectors";
import { EditorFontFamily } from "$types";
import { ChangeEvent, useCallback } from "react";
import { FontFamilyRow, FontSizeRow } from "./FontRows";
import { ToggleRow } from "./ToggleRow";

export function EditorSettingsSection() {
  const {
    lineNumbersVisible,
    textWrappingEnabled,
    syntaxHighlightingEnabled,
    editorFontSize,
    editorFontFamily,
    toggleLineNumbersVisible,
    toggleTextWrappingEnabled,
    toggleSyntaxHighlightingEnabled,
    setEditorFontSize,
    setEditorFontFamily,
  } = useLayoutSettingsEditorState();

  const handleFontSizeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setEditorFontSize(Number(event.target.value));
  }, [setEditorFontSize]);

  const handleFontFamilyChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setEditorFontFamily(event.target.value as EditorFontFamily);
  }, [setEditorFontFamily]);

  return (
    <>
      <ToggleRow
        label="Line Numbers"
        description="Show or hide line numbers in the editor gutter."
        isVisible={lineNumbersVisible}
        onToggle={toggleLineNumbersVisible} />
      <ToggleRow
        label="Text Wrapping"
        description="Wrap long lines in the editor instead of horizontal scrolling."
        isVisible={textWrappingEnabled}
        onToggle={toggleTextWrappingEnabled} />
      <ToggleRow
        label="Syntax Highlighting"
        description="Enable Markdown syntax colors and token styling."
        isVisible={syntaxHighlightingEnabled}
        onToggle={toggleSyntaxHighlightingEnabled} />
      <FontFamilyRow value={editorFontFamily} setter={handleFontFamilyChange} />
      <FontSizeRow value={editorFontSize} setter={handleFontSizeChange} />
    </>
  );
}
