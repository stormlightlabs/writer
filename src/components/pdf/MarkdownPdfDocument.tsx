import { getCodeFontFamily, getPdfFontFamily } from "$pdf/fonts";
import type { FontName, MarkdownNode, PageSize, PdfExportOptions } from "$pdf/types";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const toPdfPageSize = (size: PageSize): any => {
  if (typeof size === "string") {
    return size;
  }
  return size;
};

const createStyles = (bodyFont: string, codeFont: string, baseFontSize: number = 11) =>
  StyleSheet.create({
    page: { padding: 50, fontFamily: bodyFont },
    title: { fontSize: 24, marginBottom: 20, fontWeight: "bold" },
    heading1: { fontSize: 20, marginTop: 20, marginBottom: 10, fontWeight: "bold" },
    heading2: { fontSize: 16, marginTop: 15, marginBottom: 8, fontWeight: "bold" },
    heading3: { fontSize: 14, marginTop: 12, marginBottom: 6, fontWeight: "bold" },
    paragraph: { fontSize: baseFontSize, lineHeight: 1.5, marginBottom: 10 },
    code: {
      fontFamily: codeFont,
      fontSize: baseFontSize - 2,
      backgroundColor: "#f4f4f4",
      padding: 8,
      marginBottom: 10,
    },
    codeInline: { fontFamily: codeFont, fontSize: baseFontSize - 2, backgroundColor: "#f4f4f4", padding: 2 },
    list: { marginLeft: 20, marginBottom: 10 },
    listItem: { fontSize: baseFontSize, marginBottom: 4 },
    blockquote: { marginLeft: 20, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: "#ddd", marginBottom: 10 },
    blockquoteText: { fontSize: baseFontSize, fontStyle: "italic", color: "#666" },
    footnote: { fontSize: baseFontSize - 2, marginTop: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#ddd" },
  });

const renderNode = (
  node: MarkdownNode,
  key: number,
  styles: ReturnType<typeof createStyles>,
): React.ReactElement | null => {
  switch (node.type) {
    case "heading": {
      const headingStyle = node.level === 1 ? styles.heading1 : node.level === 2 ? styles.heading2 : styles.heading3;
      return <Text key={key} style={headingStyle}>{node.content}</Text>;
    }

    case "paragraph":
      return <Text key={key} style={styles.paragraph}>{node.content}</Text>;

    case "code":
      return <Text key={key} style={styles.code}>{node.content}</Text>;

    case "list":
      return (
        <View key={key} style={styles.list}>
          {node.items?.map((item: MarkdownNode, i: number) => {
            const k = `${key}-${i}`;
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
        <View key={key} style={styles.blockquote}>
          <Text style={styles.blockquoteText}>{node.content}</Text>
        </View>
      );

    case "footnote":
      return (
        <View key={key} style={styles.footnote}>
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

export const MarkdownPdfDocument = ({ nodes, title, options, editorFontFamily }: MarkdownPdfDocumentProps) => {
  const bodyFont = getPdfFontFamily(editorFontFamily);
  const codeFont = getCodeFontFamily();
  const styles = createStyles(bodyFont, codeFont, options.fontSize);
  return (
    <Document>
      <Page size={toPdfPageSize(options.pageSize)} style={styles.page}>
        {title && <Text style={styles.title}>{title}</Text>}
        {nodes.map((node, index) => renderNode(node, index, styles))}
      </Page>
    </Document>
  );
};
