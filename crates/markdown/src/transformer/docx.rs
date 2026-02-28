use comrak::nodes::{ListType, NodeValue};
use docx_rs::*;
use std::io::Cursor;

const ORDERED_ABSTRACT_NUM_ID: usize = 1;
const BULLET_ABSTRACT_NUM_ID: usize = 2;
const ORDERED_NUM_ID: usize = 1;
const BULLET_NUM_ID: usize = 2;

/// Half-point H1 = 24pt
const HEADING1_SIZE: usize = 48;
/// Half-point H2 = 18pt
const HEADING2_SIZE: usize = 36;
/// Half-point H3 = 14pt
const HEADING3_SIZE: usize = 28;

/// Indent for blockquotes in twips (720 = 0.5 inch)
const BLOCKQUOTE_INDENT: i32 = 720;

/// Indent for list items in twips
const LIST_INDENT: i32 = 420;

pub struct DocxTransformer;

impl DocxTransformer {
    /// Transforms a Comrak AST root node into DOCX bytes.
    pub fn transform_to_docx<'a>(root: &'a comrak::nodes::AstNode<'a>) -> Result<Vec<u8>, DocxError> {
        let mut doc = Docx::new();

        doc = doc
            .add_style(
                Style::new("Heading1", StyleType::Paragraph)
                    .name("Heading 1")
                    .bold()
                    .size(HEADING1_SIZE),
            )
            .add_style(
                Style::new("Heading2", StyleType::Paragraph)
                    .name("Heading 2")
                    .bold()
                    .size(HEADING2_SIZE),
            )
            .add_style(
                Style::new("Heading3", StyleType::Paragraph)
                    .name("Heading 3")
                    .bold()
                    .size(HEADING3_SIZE),
            );

        doc = doc
            .add_abstract_numbering(
                AbstractNumbering::new(ORDERED_ABSTRACT_NUM_ID).add_level(
                    Level::new(
                        0,
                        Start::new(1),
                        NumberFormat::new("decimal"),
                        LevelText::new("%1."),
                        LevelJc::new("left"),
                    )
                    .indent(
                        Some(LIST_INDENT),
                        Some(SpecialIndentType::Hanging(LIST_INDENT)),
                        None,
                        None,
                    ),
                ),
            )
            .add_numbering(Numbering::new(ORDERED_NUM_ID, ORDERED_ABSTRACT_NUM_ID))
            .add_abstract_numbering(
                AbstractNumbering::new(BULLET_ABSTRACT_NUM_ID).add_level(
                    Level::new(
                        0,
                        Start::new(1),
                        NumberFormat::new("bullet"),
                        LevelText::new("\u{2022}"),
                        LevelJc::new("left"),
                    )
                    .indent(
                        Some(LIST_INDENT),
                        Some(SpecialIndentType::Hanging(LIST_INDENT)),
                        None,
                        None,
                    ),
                ),
            )
            .add_numbering(Numbering::new(BULLET_NUM_ID, BULLET_ABSTRACT_NUM_ID));

        let paragraphs = Self::collect_blocks(root);
        for para in paragraphs {
            doc = doc.add_paragraph(para);
        }

        let mut buf = Cursor::new(Vec::new());
        doc.build().pack(&mut buf)?;
        Ok(buf.into_inner())
    }

    /// Collects block-level elements from the AST into DOCX paragraphs.
    fn collect_blocks<'a>(node: &'a comrak::nodes::AstNode<'a>) -> Vec<Paragraph> {
        let mut paragraphs = Vec::new();

        for child in node.children() {
            let value = child.data.borrow().value.clone();
            match value {
                NodeValue::Document => {
                    paragraphs.extend(Self::collect_blocks(child));
                }
                NodeValue::Heading(heading) => {
                    let runs = Self::collect_inline_runs(child);
                    let style_id = match heading.level {
                        1 => "Heading1",
                        2 => "Heading2",
                        3 => "Heading3",
                        _ => "Heading3",
                    };
                    let mut para = Paragraph::new().style(style_id);
                    for run in runs {
                        para = para.add_run(run);
                    }
                    paragraphs.push(para);
                }
                NodeValue::Paragraph => {
                    let runs = Self::collect_inline_runs(child);
                    if !runs.is_empty() {
                        let mut para = Paragraph::new();
                        for run in runs {
                            para = para.add_run(run);
                        }
                        paragraphs.push(para);
                    }
                }
                NodeValue::CodeBlock(code_block) => {
                    let content = code_block.literal.trim_end_matches('\n');
                    for line in content.split('\n') {
                        let run = Run::new()
                            .add_text(line)
                            .fonts(
                                RunFonts::new()
                                    .ascii("Courier New")
                                    .hi_ansi("Courier New")
                                    .cs("Courier New"),
                            )
                            .size(20);
                        paragraphs.push(Paragraph::new().add_run(run));
                    }
                }
                NodeValue::List(list) => {
                    let ordered = list.list_type == ListType::Ordered;
                    paragraphs.extend(Self::collect_list_items(child, ordered));
                }
                NodeValue::BlockQuote | NodeValue::MultilineBlockQuote(_) => {
                    paragraphs.extend(Self::collect_blockquote(child));
                }
                NodeValue::ThematicBreak => {
                    paragraphs.push(
                        Paragraph::new()
                            .add_run(Run::new().add_text("───────────────────────────"))
                            .align(AlignmentType::Center),
                    );
                }
                NodeValue::Table(_) => {
                    paragraphs.extend(Self::collect_table_as_paragraphs(child));
                }
                _ => {
                    paragraphs.extend(Self::collect_blocks(child));
                }
            }
        }

        paragraphs
    }

    /// Collects inline content from a node into a series of Runs with formatting.
    fn collect_inline_runs<'a>(node: &'a comrak::nodes::AstNode<'a>) -> Vec<Run> {
        Self::collect_inline_runs_inner(node, false, false, false)
    }

    fn collect_inline_runs_inner<'a>(
        node: &'a comrak::nodes::AstNode<'a>, bold: bool, italic: bool, code_font: bool,
    ) -> Vec<Run> {
        let mut runs = Vec::new();

        for child in node.children() {
            let value = child.data.borrow().value.clone();
            match value {
                NodeValue::Text(ref t) => {
                    let mut run = Run::new().add_text(t.to_string());
                    if bold {
                        run = run.bold();
                    }
                    if italic {
                        run = run.italic();
                    }
                    if code_font {
                        run = run.fonts(
                            RunFonts::new()
                                .ascii("Courier New")
                                .hi_ansi("Courier New")
                                .cs("Courier New"),
                        );
                    }
                    runs.push(run);
                }
                NodeValue::Code(ref code) => {
                    let mut run = Run::new().add_text(&code.literal).fonts(
                        RunFonts::new()
                            .ascii("Courier New")
                            .hi_ansi("Courier New")
                            .cs("Courier New"),
                    );
                    if bold {
                        run = run.bold();
                    }
                    if italic {
                        run = run.italic();
                    }
                    runs.push(run);
                }
                NodeValue::Strong => {
                    runs.extend(Self::collect_inline_runs_inner(child, true, italic, code_font));
                }
                NodeValue::Emph => {
                    runs.extend(Self::collect_inline_runs_inner(child, bold, true, code_font));
                }
                NodeValue::Strikethrough => {
                    let inner_runs = Self::collect_inline_runs_inner(child, bold, italic, code_font);
                    for run in inner_runs {
                        runs.push(run.strike());
                    }
                }
                NodeValue::Link(ref link) => {
                    let link_text = Self::extract_text(child);
                    let display = if link_text.is_empty() { link.url.clone() } else { link_text };
                    let mut run = Run::new().add_text(&display);
                    if bold {
                        run = run.bold();
                    }
                    if italic {
                        run = run.italic();
                    }
                    runs.push(run);
                }
                NodeValue::SoftBreak | NodeValue::LineBreak => {
                    runs.push(Run::new().add_text(" "));
                }
                NodeValue::Superscript | NodeValue::Subscript => {
                    runs.extend(Self::collect_inline_runs_inner(child, bold, italic, code_font));
                }
                _ => {
                    runs.extend(Self::collect_inline_runs_inner(child, bold, italic, code_font));
                }
            }
        }

        runs
    }

    /// Collects list items into paragraphs with numbering.
    fn collect_list_items<'a>(list_node: &'a comrak::nodes::AstNode<'a>, ordered: bool) -> Vec<Paragraph> {
        let mut paragraphs = Vec::new();
        let num_id = if ordered { ORDERED_NUM_ID } else { BULLET_NUM_ID };

        for child in list_node.children() {
            let value = child.data.borrow().value.clone();
            match value {
                NodeValue::Item(_) => {
                    let mut first_para = true;
                    for item_child in child.children() {
                        let item_value = item_child.data.borrow().value.clone();
                        match item_value {
                            NodeValue::Paragraph => {
                                let runs = Self::collect_inline_runs(item_child);
                                if !runs.is_empty() {
                                    let mut para = Paragraph::new();
                                    if first_para {
                                        para = para.numbering(NumberingId::new(num_id), IndentLevel::new(0));
                                        first_para = false;
                                    }
                                    for run in runs {
                                        para = para.add_run(run);
                                    }
                                    paragraphs.push(para);
                                }
                            }
                            NodeValue::List(nested_list) => {
                                let nested_ordered = nested_list.list_type == ListType::Ordered;
                                paragraphs.extend(Self::collect_list_items(item_child, nested_ordered));
                            }
                            _ => {}
                        }
                    }
                }
                NodeValue::TaskItem(ref task) => {
                    let checkbox = if task.symbol.is_some() { "\u{2611} " } else { "\u{2610} " };
                    let mut runs = vec![Run::new().add_text(checkbox)];
                    runs.extend(Self::collect_inline_runs(child));
                    let mut para = Paragraph::new().numbering(NumberingId::new(num_id), IndentLevel::new(0));
                    for run in runs {
                        para = para.add_run(run);
                    }
                    paragraphs.push(para);
                }
                _ => {}
            }
        }

        paragraphs
    }

    /// Collects blockquote content into indented paragraphs.
    fn collect_blockquote<'a>(node: &'a comrak::nodes::AstNode<'a>) -> Vec<Paragraph> {
        let mut paragraphs = Vec::new();

        for child in node.children() {
            let value = child.data.borrow().value.clone();
            match value {
                NodeValue::Paragraph => {
                    let runs = Self::collect_inline_runs(child);
                    if !runs.is_empty() {
                        let mut para = Paragraph::new().indent(Some(BLOCKQUOTE_INDENT), None, None, None);
                        for run in runs {
                            para = para.add_run(run.italic());
                        }
                        paragraphs.push(para);
                    }
                }
                NodeValue::BlockQuote | NodeValue::MultilineBlockQuote(_) => {
                    let inner = Self::collect_blockquote(child);
                    for para in inner {
                        paragraphs.push(para.indent(Some(BLOCKQUOTE_INDENT), None, None, None));
                    }
                }
                _ => {
                    let inner = Self::collect_blocks(child);
                    for mut para in inner {
                        para = para.indent(Some(BLOCKQUOTE_INDENT), None, None, None);
                        paragraphs.push(para);
                    }
                }
            }
        }

        paragraphs
    }

    /// Renders a table as tab-separated paragraphs (simple fallback).
    fn collect_table_as_paragraphs<'a>(node: &'a comrak::nodes::AstNode<'a>) -> Vec<Paragraph> {
        let mut paragraphs = Vec::new();

        for row in node.children() {
            if let NodeValue::TableRow(_) = &row.data.borrow().value {
                let cells: Vec<String> = row
                    .children()
                    .filter_map(|cell| {
                        if let NodeValue::TableCell = &cell.data.borrow().value {
                            Some(Self::extract_text(cell))
                        } else {
                            None
                        }
                    })
                    .collect();

                if !cells.is_empty() {
                    let line = cells.join("\t");
                    paragraphs.push(Paragraph::new().add_run(Run::new().add_text(&line)));
                }
            }
        }

        paragraphs
    }

    /// Extracts plain text from a node tree (no formatting).
    fn extract_text<'a>(node: &'a comrak::nodes::AstNode<'a>) -> String {
        let mut text = String::new();
        for child in node.children() {
            let value = child.data.borrow().value.clone();
            match value {
                NodeValue::Text(ref t) => text.push_str(t),
                NodeValue::Code(ref code) => text.push_str(&code.literal),
                NodeValue::SoftBreak | NodeValue::LineBreak => text.push(' '),
                NodeValue::Link(ref link) => {
                    let inner = Self::extract_text(child);
                    if inner.is_empty() {
                        text.push_str(&link.url);
                    } else {
                        text.push_str(&inner);
                    }
                }
                _ => text.push_str(&Self::extract_text(child)),
            }
        }
        text
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use comrak::{Arena, Options, parse_document};

    fn parse_md(text: &str) -> Vec<u8> {
        let arena = Arena::new();
        let mut opts = Options::default();
        opts.extension.strikethrough = true;
        opts.extension.table = true;
        opts.extension.tasklist = true;
        let root = parse_document(&arena, text, &opts);
        DocxTransformer::transform_to_docx(root).expect("DOCX generation should succeed")
    }

    #[test]
    fn test_empty_document() {
        let bytes = parse_md("");
        assert!(bytes.len() > 4);
        assert_eq!(&bytes[0..2], b"PK");
    }

    #[test]
    fn test_heading_levels() {
        let md = "# Heading 1\n\n## Heading 2\n\n### Heading 3\n";
        let bytes = parse_md(md);
        assert!(bytes.len() > 100);
        assert_eq!(&bytes[0..2], b"PK");
    }

    #[test]
    fn test_paragraph_with_inline_formatting() {
        let md = "This is **bold** and *italic* and `code` text.\n";
        let bytes = parse_md(md);
        assert_eq!(&bytes[0..2], b"PK");
    }

    #[test]
    fn test_ordered_list() {
        let md = "1. First\n2. Second\n3. Third\n";
        let bytes = parse_md(md);
        assert_eq!(&bytes[0..2], b"PK");
    }

    #[test]
    fn test_unordered_list() {
        let md = "- Apple\n- Banana\n- Cherry\n";
        let bytes = parse_md(md);
        assert_eq!(&bytes[0..2], b"PK");
    }

    #[test]
    fn test_blockquote() {
        let md = "> This is a blockquote.\n";
        let bytes = parse_md(md);
        assert_eq!(&bytes[0..2], b"PK");
    }

    #[test]
    fn test_code_block() {
        let md = "```rust\nfn main() {\n    println!(\"hello\");\n}\n```\n";
        let bytes = parse_md(md);
        assert_eq!(&bytes[0..2], b"PK");
    }

    #[test]
    fn test_thematic_break() {
        let md = "Before\n\n---\n\nAfter\n";
        let bytes = parse_md(md);
        assert_eq!(&bytes[0..2], b"PK");
    }

    #[test]
    fn test_strikethrough() {
        let md = "This is ~~struck~~ text.\n";
        let bytes = parse_md(md);
        assert_eq!(&bytes[0..2], b"PK");
    }

    #[test]
    fn test_table() {
        let md = "| A | B |\n|---|---|\n| 1 | 2 |\n";
        let bytes = parse_md(md);
        assert_eq!(&bytes[0..2], b"PK");
    }

    #[test]
    fn test_mixed_document() {
        let md = "\
# Title

Some paragraph with **bold** and *italic*.

## Section

1. First item
2. Second item

- Bullet one
- Bullet two

> A blockquote

```
code block
```

---

Final paragraph.
";
        let bytes = parse_md(md);
        assert_eq!(&bytes[0..2], b"PK");
        assert!(bytes.len() > 500);
    }

    #[test]
    fn test_nested_formatting() {
        let md = "This is ***bold and italic*** text.\n";
        let bytes = parse_md(md);
        assert_eq!(&bytes[0..2], b"PK");
    }

    #[test]
    fn test_link() {
        let md = "Visit [example](https://example.com) for more.\n";
        let bytes = parse_md(md);
        assert_eq!(&bytes[0..2], b"PK");
    }

    #[test]
    fn test_task_list() {
        let md = "- [ ] Todo\n- [x] Done\n";
        let bytes = parse_md(md);
        assert_eq!(&bytes[0..2], b"PK");
    }
}
