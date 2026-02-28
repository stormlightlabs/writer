use super::PdfNode;
use comrak::nodes::NodeValue;

pub struct MarkdownTransformer;

impl MarkdownTransformer {
    /// Extracts plain text content from a node and its children
    fn extract_text_content<'a>(node: &'a comrak::nodes::AstNode<'a>) -> String {
        let mut text = String::new();

        for child in node.children() {
            match &child.data.borrow().value {
                NodeValue::Text(t) => text.push_str(t),
                NodeValue::SoftBreak | NodeValue::LineBreak => text.push(' '),
                NodeValue::Code(code) => text.push_str(&code.literal),
                NodeValue::Emph | NodeValue::Strong => text.push_str(&Self::extract_text_content(child)),
                NodeValue::Link(link) => {
                    let link_text = Self::extract_text_content(child);
                    if link_text.is_empty() {
                        text.push_str(&link.url);
                    } else {
                        text.push_str(&link_text);
                    }
                }
                NodeValue::Strikethrough => text.push_str(&Self::extract_text_content(child)),
                NodeValue::FootnoteReference(_) => continue,
                NodeValue::TaskItem(task_item) => {
                    let checkbox = if task_item.symbol.is_some() { "[x] " } else { "[ ] " };
                    text.push_str(checkbox);
                    text.push_str(&Self::extract_text_content(child));
                }
                NodeValue::Superscript => text.push_str(&Self::extract_text_content(child)),
                NodeValue::Subscript => text.push_str(&Self::extract_text_content(child)),
                _ => text.push_str(&Self::extract_text_content(child)),
            }
        }

        text.trim().to_string()
    }

    /// Transforms a Comrak AST node into PDF nodes
    pub fn transform_to_pdf_nodes<'a>(node: &'a comrak::nodes::AstNode<'a>) -> Vec<PdfNode> {
        let mut nodes = Vec::new();

        for child in node.children() {
            match &child.data.borrow().value {
                NodeValue::Document => nodes.extend(Self::transform_to_pdf_nodes(child)),
                NodeValue::Heading(heading) => {
                    let content = Self::extract_text_content(child);
                    nodes.push(PdfNode::Heading { level: heading.level, content });
                }
                NodeValue::Paragraph => {
                    let content = Self::extract_text_content(child);
                    if !content.is_empty() {
                        nodes.push(PdfNode::Paragraph { content });
                    }
                }
                NodeValue::CodeBlock(code_block) => {
                    let content = code_block.literal.clone();
                    let language = if code_block.info.is_empty() { None } else { Some(code_block.info.clone()) };
                    nodes.push(PdfNode::Code { content, language });
                }
                NodeValue::List(list) => {
                    let items = Self::transform_list_items(child, list.list_type == comrak::nodes::ListType::Ordered);
                    if !items.is_empty() {
                        nodes
                            .push(PdfNode::List { items, ordered: list.list_type == comrak::nodes::ListType::Ordered });
                    }
                }
                NodeValue::BlockQuote => {
                    let content = Self::extract_text_content(child);
                    nodes.push(PdfNode::Blockquote { content });
                }
                NodeValue::FootnoteDefinition(footnote) => {
                    let content = Self::extract_text_content(child);
                    nodes.push(PdfNode::Footnote { id: footnote.name.clone(), content });
                }
                _ => nodes.extend(Self::transform_to_pdf_nodes(child)),
            }
        }

        nodes
    }

    /// Transforms list items from a list node
    fn transform_list_items<'a>(list_node: &'a comrak::nodes::AstNode<'a>, _ordered: bool) -> Vec<PdfNode> {
        let mut items = Vec::new();

        for child in list_node.children() {
            match &child.data.borrow().value {
                comrak::nodes::NodeValue::Item(_) => {
                    let content = Self::extract_text_content(child);
                    if !content.is_empty() {
                        items.push(PdfNode::Paragraph { content });
                    }
                }
                _ => items.extend(Self::transform_list_items(child, _ordered)),
            }
        }

        items
    }

    /// Transforms a Comrak AST node into plaintext
    pub fn transform_to_plaintext<'a>(node: &'a comrak::nodes::AstNode<'a>) -> String {
        let mut result = String::new();
        let mut first_block = true;

        for child in node.children() {
            let block_text = match &child.data.borrow().value {
                NodeValue::Document => Self::transform_to_plaintext(child),
                NodeValue::Heading(_) => {
                    let content = Self::extract_text_content(child);
                    if content.is_empty() { String::new() } else { format!("{}\n", content) }
                }
                NodeValue::Paragraph => {
                    let content = Self::extract_text_content(child);
                    if content.is_empty() { String::new() } else { format!("{}\n", content) }
                }
                NodeValue::CodeBlock(code_block) => {
                    let content = code_block.literal.trim_end_matches('\n');
                    if content.is_empty() { String::new() } else { format!("{}\n", content) }
                }
                NodeValue::List(list) => {
                    Self::transform_list_to_plaintext(child, list.list_type == comrak::nodes::ListType::Ordered, 0)
                }
                NodeValue::BlockQuote => {
                    let content = Self::extract_text_content(child);
                    if content.is_empty() {
                        String::new()
                    } else {
                        content
                            .lines()
                            .map(|line| format!("> {}", line))
                            .collect::<Vec<_>>()
                            .join("\n")
                            + "\n"
                    }
                }
                NodeValue::ThematicBreak => "---\n".to_string(),
                NodeValue::FootnoteDefinition(footnote) => {
                    let content = Self::extract_text_content(child);
                    if content.is_empty() { String::new() } else { format!("[^{}]: {}\n", footnote.name, content) }
                }
                NodeValue::HtmlBlock(html) => {
                    let text = html.literal.trim();
                    if text.is_empty() { String::new() } else { format!("{}\n", text) }
                }
                NodeValue::Table(_) => Self::transform_table_to_plaintext(child),
                NodeValue::MultilineBlockQuote(_) => {
                    let content = Self::extract_text_content(child);
                    if content.is_empty() {
                        String::new()
                    } else {
                        content
                            .lines()
                            .map(|line| format!("> {}", line))
                            .collect::<Vec<_>>()
                            .join("\n")
                            + "\n"
                    }
                }
                _ => continue,
            };

            if !block_text.is_empty() {
                if !first_block {
                    result.push('\n');
                }
                result.push_str(&block_text);
                first_block = false;
            }
        }

        result
    }

    /// Transforms a list to plaintext with indentation
    fn transform_list_to_plaintext<'a>(
        list_node: &'a comrak::nodes::AstNode<'a>, ordered: bool, depth: usize,
    ) -> String {
        let mut result = String::new();
        let mut item_number = 1;
        let indent = "  ".repeat(depth);

        for child in list_node.children() {
            match &child.data.borrow().value {
                NodeValue::Item(_) => {
                    let prefix = if ordered {
                        let num = item_number;
                        item_number += 1;
                        format!("{}{}. ", indent, num)
                    } else {
                        format!("{}- ", indent)
                    };

                    let mut item_content = String::new();
                    let mut first_item_block = true;

                    for item_child in child.children() {
                        let child_text = match &item_child.data.borrow().value {
                            NodeValue::Paragraph => {
                                let content = Self::extract_text_content(item_child);
                                if content.is_empty() { String::new() } else { format!("{}\n", content) }
                            }
                            NodeValue::List(nested_list) => Self::transform_list_to_plaintext(
                                item_child,
                                nested_list.list_type == comrak::nodes::ListType::Ordered,
                                depth + 1,
                            ),
                            NodeValue::BlockQuote => {
                                let content = Self::extract_text_content(item_child);
                                if content.is_empty() {
                                    String::new()
                                } else {
                                    content
                                        .lines()
                                        .map(|line| format!("> {}", line))
                                        .collect::<Vec<_>>()
                                        .join("\n")
                                        + "\n"
                                }
                            }
                            _ => continue,
                        };

                        if !child_text.is_empty() {
                            if !first_item_block {
                                item_content.push('\n');
                            }
                            item_content.push_str(&child_text);
                            first_item_block = false;
                        }
                    }

                    if !item_content.is_empty() {
                        let lines: Vec<&str> = item_content.lines().collect();
                        if !lines.is_empty() {
                            result.push_str(&prefix);
                            result.push_str(lines[0]);
                            result.push('\n');

                            for line in &lines[1..] {
                                if !line.is_empty() {
                                    result.push_str(&indent);
                                    result.push_str("  "); // Extra indent for continuation
                                    result.push_str(line);
                                }
                                result.push('\n');
                            }
                        }
                    }
                }
                NodeValue::TaskItem(task_item) => {
                    let checkbox = if task_item.symbol.is_some() { "[x] " } else { "[ ] " };
                    let content = Self::extract_text_content(child);
                    if !content.is_empty() {
                        result.push_str(&indent);
                        result.push_str(checkbox);
                        result.push_str(&content);
                        result.push('\n');
                    }
                }
                _ => {
                    result.push_str(&Self::transform_list_to_plaintext(child, ordered, depth));
                }
            }
        }

        result
    }

    /// Transforms a table to plaintext (tab-separated format)
    fn transform_table_to_plaintext<'a>(node: &'a comrak::nodes::AstNode<'a>) -> String {
        let mut rows: Vec<String> = Vec::new();

        for row in node.children() {
            if let NodeValue::TableRow(_) = &row.data.borrow().value {
                let cells: Vec<String> = row
                    .children()
                    .filter_map(|cell| match &cell.data.borrow().value {
                        NodeValue::TableCell => Some(Self::extract_text_content(cell)),
                        _ => None,
                    })
                    .collect();
                if !cells.is_empty() {
                    rows.push(cells.join("\t"));
                }
            }
        }

        if rows.is_empty() { String::new() } else { format!("{}\n", rows.join("\n")) }
    }
}
