import { useLayoutSettingsEditorState } from "$state/selectors";
import { EditorFontFamily, MarkdownPreviewStyle } from "$types";
import { ChangeEvent, useCallback } from "react";
import { FontFamilyRow, FontSizeRow } from "./FontRows";
import { ToggleRow } from "./ToggleRow";

const MARKDOWN_PREVIEW_STYLE_OPTIONS: Array<{ label: string; value: MarkdownPreviewStyle }> = [{
  label: "GitHub Markdown",
  value: "github",
}, { label: "PDF Style", value: "pdf" }];

export function EditorSettingsSection() {
  const {
    lineNumbersVisible,
    textWrappingEnabled,
    syntaxHighlightingEnabled,
    editorFontSize,
    editorFontFamily,
    markdownPreviewStyle,
    toggleLineNumbersVisible,
    toggleTextWrappingEnabled,
    toggleSyntaxHighlightingEnabled,
    setEditorFontSize,
    setEditorFontFamily,
    setMarkdownPreviewStyle,
  } = useLayoutSettingsEditorState();

  const handleFontSizeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setEditorFontSize(Number(event.target.value));
  }, [setEditorFontSize]);

  const handleFontFamilyChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setEditorFontFamily(event.target.value as EditorFontFamily);
  }, [setEditorFontFamily]);

  const handlePreviewStyleChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setMarkdownPreviewStyle(event.target.value as MarkdownPreviewStyle);
  }, [setMarkdownPreviewStyle]);

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
      <div className="py-2.5">
        <label className="m-0 text-[0.8125rem] text-text-primary block mb-1.5" htmlFor="markdown-preview-style">
          Preview Style
        </label>
        <select
          id="markdown-preview-style"
          value={markdownPreviewStyle}
          onChange={handlePreviewStyleChange}
          className="w-full h-9 px-2.5 rounded border border-stroke-subtle bg-field-01 text-text-primary text-sm">
          {MARKDOWN_PREVIEW_STYLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
      <FontFamilyRow value={editorFontFamily} setter={handleFontFamilyChange} />
      <FontSizeRow value={editorFontSize} setter={handleFontSizeChange} />
    </>
  );
}
