export type Orientation = "portrait" | "landscape";

export type StandardPageSize = "A4" | "A3" | "A5" | "LETTER" | "LEGAL" | "TABLOID" | "EXECUTIVE" | "FOLIO";

export type CustomPageSize = { width: number; height: number };

export type PageSize = StandardPageSize | CustomPageSize;

export type Margins = { top: number; right: number; bottom: number; left: number };

export type PdfExportOptions = {
  pageSize: PageSize;
  orientation: Orientation;
  margins: Margins;
  fontSize?: number;
  lineHeight?: number;
  includeHeader?: boolean;
  includeFooter?: boolean;
};

export type MarkdownNode =
  | { type: "heading"; level: number; content: string }
  | { type: "paragraph"; content: string }
  | { type: "code"; content: string; language?: string }
  | { type: "list"; items: MarkdownNode[]; ordered: boolean }
  | { type: "blockquote"; content: string }
  | { type: "footnote"; id: string; content: string };

export type PdfRenderResult = { nodes: MarkdownNode[]; title?: string; wordCount: number };

export type FontName =
  | "IBM Plex Mono"
  | "IBM Plex Sans Variable"
  | "IBM Plex Serif"
  | "Monaspace Argon"
  | "Monaspace Krypton"
  | "Monaspace Neon"
  | "Monaspace Radon"
  | "Monaspace Xenon";
