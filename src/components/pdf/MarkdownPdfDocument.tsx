import { getCodeFontFamily, getPdfFontFamily } from "$pdf/fonts";
import type { FontName, MarkdownNode, PageSize, PdfExportOptions } from "$pdf/types";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { useCallback, useMemo } from "react";

type TStyleSheet = ReturnType<typeof createStyles>;

const toPdfPageSize = (size: PageSize): PageSize => {
  if (typeof size === "string") {
    return size;
  }
  return size;
};

const getHeadingStyle = (level: number, styles: TStyleSheet) => {
  switch (level) {
    case 1:
      return styles.heading1;
    case 2:
      return styles.heading2;
    case 3:
      return styles.heading3;
    default:
      return styles.paragraph;
  }
};

const createStyles = (
  bodyFont: string,
  codeFont: string,
  options: PdfExportOptions,
  baseFontSize: number = 11,
  lineHeight: number = 1.5,
) =>
  StyleSheet.create({
    page: {
      paddingTop: options.margins.top,
      paddingRight: options.margins.right,
      paddingBottom: options.margins.bottom,
      paddingLeft: options.margins.left,
      fontFamily: bodyFont,
    },
    header: { marginBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e0e0e0", paddingBottom: 8 },
    footer: { fontSize: baseFontSize - 3, color: "#666", textAlign: "center" },
    content: { flexGrow: 1 },
    title: { fontSize: 24, marginBottom: 20, fontWeight: "bold" },
    heading1: { fontSize: 20, marginTop: 20, marginBottom: 10, fontWeight: "bold" },
    heading2: { fontSize: 16, marginTop: 15, marginBottom: 8, fontWeight: "bold" },
    heading3: { fontSize: 14, marginTop: 12, marginBottom: 6, fontWeight: "bold" },
    paragraph: { fontSize: baseFontSize, lineHeight, marginBottom: 10 },
    code: {
      fontFamily: codeFont,
      fontSize: baseFontSize - 2,
      backgroundColor: "#f4f4f4",
      padding: 8,
      marginBottom: 10,
    },
    list: { marginLeft: 20, marginBottom: 10 },
    listItem: { fontSize: baseFontSize, lineHeight, marginBottom: 4 },
    blockquote: { marginLeft: 20, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: "#ddd", marginBottom: 10 },
    blockquoteText: { fontSize: baseFontSize, lineHeight, fontStyle: "italic", color: "#666" },
    footnote: { fontSize: baseFontSize - 2, marginTop: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#ddd" },
  });

type DocumentNodeProps = { node: MarkdownNode; styles: TStyleSheet };

const DocumentNode = ({ node, styles }: DocumentNodeProps) => {
  switch (node.type) {
    case "heading": {
      const headingStyle = getHeadingStyle(node.level, styles);
      return <Text style={headingStyle}>{node.content}</Text>;
    }
    case "paragraph":
      return <Text style={styles.paragraph}>{node.content}</Text>;
    case "code":
      return <Text style={styles.code}>{node.content}</Text>;
    case "list":
      return (
        <View style={styles.list}>
          {node.items?.map((item: MarkdownNode, i: number) => {
            const k = `${i}`;
            return (
              <Text key={k} style={styles.listItem}>
                {node.ordered ? `${i + 1}. ` : "• "}
                {item.type === "paragraph" ? item.content : ""}
              </Text>
            );
          })}
        </View>
      );
    case "blockquote":
      return (
        <View style={styles.blockquote}>
          <Text style={styles.blockquoteText}>{node.content}</Text>
        </View>
      );
    case "footnote":
      return (
        <View style={styles.footnote}>
          <Text>[{node.id}] {node.content}</Text>
        </View>
      );
    default:
      return null;
  }
};

type MarkdownPdfDocumentProps = {
  nodes: MarkdownNode[];
  title?: string;
  options: PdfExportOptions;
  editorFontFamily: FontName;
};

const DocumentTitle = (
  { title, styles, options }: { title?: string; styles: TStyleSheet; options: PdfExportOptions },
) => !options.includeHeader && title ? <Text style={styles.title}>{title}</Text> : null;

const DocumentBody = (
  { nodes, title, styles, options }: {
    nodes: MarkdownNode[];
    title?: string;
    styles: ReturnType<typeof createStyles>;
    options: PdfExportOptions;
  },
) => (
  <View style={styles.content}>
    <DocumentTitle title={title} styles={styles} options={options} />
    {nodes.map((node, index) => {
      const k = `${index}`;
      return <DocumentNode key={k} node={node} styles={styles} />;
    })}
  </View>
);

const DocumentHeader = ({ title, styles }: { title: string; styles: TStyleSheet }) => (
  <Text style={styles.header} fixed>{title}</Text>
);

const DocumentFooter = (
  { styles, renderer }: {
    styles: TStyleSheet;
    renderer: (props: { pageNumber: number; totalPages: number }) => string;
  },
) => <Text style={styles.footer} fixed render={renderer} />;

export const MarkdownPdfDocument = ({ nodes, title, options, editorFontFamily }: MarkdownPdfDocumentProps) => {
  const bodyFont = getPdfFontFamily(editorFontFamily);
  const codeFont = getCodeFontFamily();
  const styles = createStyles(bodyFont, codeFont, options, options.fontSize, options.lineHeight);
  const renderPageNumber = useCallback(
    ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}`,
    [],
  );
  const showHeader = useMemo(() => options.includeHeader && title, [options.includeHeader, title]);

  return (
    <Document>
      <Page size={toPdfPageSize(options.pageSize)} orientation={options.orientation} style={styles.page}>
        {showHeader && <DocumentHeader title={title!} styles={styles} />}
        <DocumentBody nodes={nodes} title={title} styles={styles} options={options} />
        {options.includeFooter && <DocumentFooter styles={styles} renderer={renderPageNumber} />}
      </Page>
    </Document>
  );
};
