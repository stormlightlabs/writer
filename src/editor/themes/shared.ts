import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

type Color =
  | "background"
  | "surface"
  | "text"
  | "textMuted"
  | "textDisabled"
  | "border"
  | "blue"
  | "cyan"
  | "green"
  | "magenta"
  | "orange"
  | "purple"
  | "red"
  | "teal"
  | "yellow"
  | "white"
  | "black";

export type ThemeOptions = {
  dark: boolean;
  selectionBg: string;
  selectionBgFocused: string;
  activeLineBg: string;
  tooltipShadowOpacity: number;
  searchMatchOpacity: number;
  searchMatchSelectedOpacity: number;
  highlightOpacity: number;
  placeholderColor: "textMuted" | "textDisabled";
};

export type Colors = Record<Color, string>;

export function createTheme(palette: Colors, options: ThemeOptions) {
  const theme = EditorView.theme({
    "&": {
      backgroundColor: palette.background,
      color: palette.text,
      fontSize: "var(--editor-font-size, 14px)",
      fontFamily: "var(--editor-font-family, \"IBM Plex Mono\", \"SF Mono\", Monaco, monospace)",
    },
    ".cm-scroller": { fontFamily: "var(--editor-font-family, \"IBM Plex Mono\", \"SF Mono\", Monaco, monospace)" },
    ".cm-content": {
      fontFamily: "var(--editor-font-family, \"IBM Plex Mono\", \"SF Mono\", Monaco, monospace)",
      caretColor: palette.cyan,
      padding: "16px 0",
    },
    ".cm-cursor": { borderLeftColor: palette.cyan, borderLeftWidth: "2px" },
    "&.cm-focused .cm-cursor": { borderLeftColor: palette.cyan },
    "&.cm-focused .cm-selectionBackground": { backgroundColor: options.selectionBgFocused },
    ".cm-selectionBackground": { backgroundColor: options.selectionBg },
    ".cm-activeLine": { backgroundColor: options.activeLineBg },
    ".cm-activeLineGutter": { backgroundColor: palette.surface },
    ".cm-gutters": {
      backgroundColor: palette.background,
      color: palette.textMuted,
      borderRight: `1px solid ${palette.border}`,
      paddingRight: "8px",
    },
    ".cm-lineNumbers": { fontFamily: "\"IBM Plex Mono\", \"SF Mono\", Monaco, monospace" },
    ".cm-lineNumbers .cm-gutterElement": { padding: "0 8px", minWidth: "32px" },
    ".cm-foldPlaceholder": {
      backgroundColor: palette.surface,
      border: `1px solid ${palette.border}`,
      borderRadius: "3px",
      color: palette.textMuted,
      padding: "0 4px",
    },
    ".cm-foldGutter .cm-gutterElement": { color: palette.textMuted, cursor: "pointer" },
    ".cm-tooltip": {
      backgroundColor: palette.surface,
      border: `1px solid ${palette.border}`,
      borderRadius: "4px",
      boxShadow: `0 4px 12px rgba(0, 0, 0, ${options.tooltipShadowOpacity})`,
    },
    ".cm-tooltip-autocomplete": { backgroundColor: palette.surface },
    ".cm-tooltip-autocomplete ul li[aria-selected]": { backgroundColor: palette.blue, color: palette.white },
    ".cm-completionLabel": { color: palette.text },
    ".cm-completionDetail": { color: palette.textMuted },
    ".cm-completionIcon": { color: palette.cyan },
    ".cm-searchMatch": {
      backgroundColor: `rgba(255, 111, 0, ${options.searchMatchOpacity})`,
      outline: `1px solid ${palette.yellow}`,
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: `rgba(255, 111, 0, ${options.searchMatchSelectedOpacity})`,
    },
    ".cm-panel": { backgroundColor: palette.surface, borderTop: `1px solid ${palette.border}` },
    ".cm-panel button": {
      backgroundColor: palette.blue,
      color: palette.white,
      border: "none",
      borderRadius: "3px",
      padding: "4px 12px",
      cursor: "pointer",
    },
    ".cm-panel input": {
      backgroundColor: palette.background,
      color: palette.text,
      border: `1px solid ${palette.border}`,
      borderRadius: "3px",
      padding: "4px 8px",
    },
    ".cm-placeholder": { color: palette[options.placeholderColor] },
    ".cm-highlight": { backgroundColor: `rgba(255, 111, 0, ${options.highlightOpacity})` },
    ".cm-specialChar": { color: palette.red },
    "& .cm-scroller::-webkit-scrollbar": { width: "10px", height: "10px" },
    "& .cm-scroller::-webkit-scrollbar-track": { background: palette.background },
    "& .cm-scroller::-webkit-scrollbar-thumb": { background: palette.border, borderRadius: "5px" },
    "& .cm-scroller::-webkit-scrollbar-thumb:hover": { background: palette.textDisabled },
    "& .cm-scroller": { scrollbarColor: `${palette.border} ${palette.background}`, scrollbarWidth: "thin" },
  }, { dark: options.dark });

  const highlight = HighlightStyle.define([
    { tag: tags.keyword, color: palette.magenta, fontWeight: "bold" },
    { tag: tags.controlKeyword, color: palette.magenta },
    { tag: tags.definitionKeyword, color: palette.magenta },
    { tag: tags.modifier, color: palette.magenta },
    { tag: tags.operatorKeyword, color: palette.magenta },
    { tag: tags.function(tags.variableName), color: palette.blue },
    { tag: tags.function(tags.definition(tags.variableName)), color: palette.blue },
    { tag: tags.labelName, color: palette.cyan },
    { tag: tags.namespace, color: palette.cyan },
    { tag: tags.macroName, color: palette.cyan },
    { tag: tags.literal, color: palette.teal },
    { tag: tags.string, color: palette.green },
    { tag: tags.docString, color: palette.green },
    { tag: tags.character, color: palette.green },
    { tag: tags.attributeValue, color: palette.green },
    { tag: tags.number, color: palette.teal },
    { tag: tags.integer, color: palette.teal },
    { tag: tags.float, color: palette.teal },
    { tag: tags.bool, color: palette.teal },
    { tag: tags.regexp, color: palette.orange },
    { tag: tags.escape, color: palette.orange },
    { tag: tags.color, color: palette.orange },
    { tag: tags.url, color: palette.cyan, textDecoration: "underline" },
    { tag: tags.keyword, color: palette.magenta },
    { tag: tags.self, color: palette.purple },
    { tag: tags.null, color: palette.purple },
    { tag: tags.atom, color: palette.purple },
    { tag: tags.unit, color: palette.purple },
    { tag: tags.modifier, color: palette.magenta },
    { tag: tags.operator, color: palette.cyan },
    { tag: tags.derefOperator, color: palette.cyan },
    { tag: tags.arithmeticOperator, color: palette.cyan },
    { tag: tags.logicOperator, color: palette.cyan },
    { tag: tags.bitwiseOperator, color: palette.cyan },
    { tag: tags.compareOperator, color: palette.cyan },
    { tag: tags.updateOperator, color: palette.cyan },
    { tag: tags.definitionOperator, color: palette.cyan },
    { tag: tags.typeOperator, color: palette.magenta },
    { tag: tags.controlOperator, color: palette.cyan },
    { tag: tags.punctuation, color: palette.text },
    { tag: tags.separator, color: palette.text },
    { tag: tags.bracket, color: palette.text },
    { tag: tags.angleBracket, color: palette.text },
    { tag: tags.squareBracket, color: palette.text },
    { tag: tags.paren, color: palette.text },
    { tag: tags.brace, color: palette.text },
    { tag: tags.contentSeparator, color: palette.text },
    { tag: tags.comment, color: palette.textMuted, fontStyle: "italic" },
    { tag: tags.lineComment, color: palette.textMuted, fontStyle: "italic" },
    { tag: tags.blockComment, color: palette.textMuted, fontStyle: "italic" },
    { tag: tags.docComment, color: palette.textMuted, fontStyle: "italic" },
    { tag: tags.name, color: palette.text },
    { tag: tags.variableName, color: palette.text },
    { tag: tags.typeName, color: palette.yellow },
    { tag: tags.tagName, color: palette.blue },
    { tag: tags.attributeName, color: palette.cyan },
    { tag: tags.className, color: palette.yellow },
    { tag: tags.labelName, color: palette.cyan },
    { tag: tags.namespace, color: palette.cyan },
    { tag: tags.macroName, color: palette.cyan },
    { tag: tags.propertyName, color: palette.cyan },
    { tag: tags.special(tags.propertyName), color: palette.cyan },
    { tag: tags.heading1, color: palette.blue, fontWeight: "bold", fontSize: "1.5em" },
    { tag: tags.heading2, color: palette.blue, fontWeight: "bold", fontSize: "1.3em" },
    { tag: tags.heading3, color: palette.blue, fontWeight: "bold", fontSize: "1.1em" },
    { tag: tags.heading4, color: palette.blue, fontWeight: "bold" },
    { tag: tags.heading5, color: palette.blue, fontWeight: "bold" },
    { tag: tags.heading6, color: palette.blue, fontWeight: "bold" },
    { tag: tags.heading, color: palette.blue, fontWeight: "bold" },
    { tag: tags.quote, color: palette.green, fontStyle: "italic" },
    { tag: tags.list, color: palette.cyan },
    { tag: tags.emphasis, color: palette.text, fontStyle: "italic" },
    { tag: tags.strong, color: palette.text, fontWeight: "bold" },
    { tag: tags.strikethrough, color: palette.textMuted, textDecoration: "line-through" },
    { tag: tags.link, color: palette.cyan, textDecoration: "underline" },
    { tag: tags.monospace, color: palette.orange, fontFamily: "monospace" },
    { tag: tags.processingInstruction, color: palette.magenta },
    { tag: tags.annotation, color: palette.yellow },
    { tag: tags.invalid, color: palette.red, borderBottom: `1px dotted ${palette.red}` },
    { tag: tags.meta, color: palette.textMuted },
    { tag: tags.documentMeta, color: palette.textMuted },
    { tag: tags.changed, color: palette.yellow },
    { tag: tags.deleted, color: palette.red },
    { tag: tags.inserted, color: palette.green },
  ]);

  return [theme, syntaxHighlighting(highlight)];
}
