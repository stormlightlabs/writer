use crate::{AppError, ErrorCode};
use comrak::{
    Arena, Options,
    nodes::{AstNode, NodeCodeBlock, NodeHeading, NodeMath, NodeValue},
    parse_document,
};
use jacquard::common::types::{
    blob::{Blob, BlobRef, MimeType},
    cid::CidLink,
    ident::AtIdentifier,
    string::AtUri,
};
use jacquard::types::did::Did;
use jacquard::{IntoStatic, api::pub_leaflet::pages::linear_document::BlockAlignment};
use jacquard::{
    api::pub_leaflet::{
        blocks::{
            blockquote::Blockquote,
            code::Code,
            header::Header,
            horizontal_rule::HorizontalRule,
            image::{AspectRatio, Image},
            math::Math,
            text::Text,
            unordered_list::{ListItem, ListItemContent, UnorderedList},
        },
        document::{Document, DocumentPagesItem},
        pages::linear_document::{Block, BlockBlock, LinearDocument},
        richtext::facet::{
            AtMention, Bold, ByteSlice, Code as CodeFacet, DidMention, Facet, FacetFeaturesItem, Italic, Link,
            Strikethrough,
        },
    },
    types::uri::UriValue,
};
use std::cmp::Reverse;

const CANVAS_PAGE_OMITTED: &str = "<!-- canvas page omitted -->";

pub fn leaflet_document_to_markdown(document: &Document<'_>) -> Result<String, AppError> {
    let mut parts = Vec::new();

    for page in &document.pages {
        match page {
            DocumentPagesItem::LinearDocument(page) => {
                for block in &page.blocks {
                    parts.push(render_block(block)?);
                }
            }
            DocumentPagesItem::Canvas(_) => parts.push(CANVAS_PAGE_OMITTED.to_string()),
            _ => parts.push(comment_marker("unsupported: unknown page")),
        }
    }

    Ok(parts.join("\n\n"))
}

pub fn markdown_to_leaflet_document(markdown: &str, title: &str, author: &str) -> Result<Document<'static>, AppError> {
    let author = AtIdentifier::new_owned(author)
        .map_err(|error| AppError::new(ErrorCode::Parse, format!("Invalid author identifier: {}", error)))?;

    let arena = Arena::new();
    let root = parse_document(&arena, markdown, &markdown_options());
    let mut blocks = Vec::new();

    for node in root.children() {
        if let Some(block) = markdown_node_to_block(node)? {
            blocks.push(block);
        }
    }

    let page = LinearDocument::new().blocks(blocks).build();
    Ok(Document::new()
        .author(author)
        .title(title.to_string())
        .pages(vec![DocumentPagesItem::LinearDocument(Box::new(page))])
        .build()
        .into_static())
}

fn markdown_options() -> Options<'static> {
    Options {
        extension: comrak::options::Extension {
            strikethrough: true,
            footnotes: true,
            math_dollars: true,
            math_code: true,
            ..Default::default()
        },
        parse: comrak::options::Parse::default(),
        render: comrak::options::Render::default(),
    }
}

fn render_block(block: &Block<'_>) -> Result<String, AppError> {
    let body = match &block.block {
        BlockBlock::Text(text) => render_rich_text(&text.plaintext, text.facets.as_deref())?,
        BlockBlock::Header(header) => {
            let level = header.level.unwrap_or(1).clamp(1, 6) as usize;
            format!(
                "{} {}",
                "#".repeat(level),
                render_rich_text(&header.plaintext, header.facets.as_deref())?
            )
        }
        BlockBlock::Blockquote(blockquote) => prefix_lines(
            &render_rich_text(&blockquote.plaintext, blockquote.facets.as_deref())?,
            "> ",
        ),
        BlockBlock::Code(code) => render_code_block(code),
        BlockBlock::Image(image) => render_image(image),
        BlockBlock::UnorderedList(list) => render_list_items(&list.children, 0)?,
        BlockBlock::HorizontalRule(_) => "---".to_string(),
        BlockBlock::Math(math) => format!("$$\n{}\n$$", math.tex),
        BlockBlock::Iframe(_) => comment_marker("unsupported: iframe"),
        BlockBlock::Website(_) => comment_marker("unsupported: website"),
        BlockBlock::BskyPost(_) => comment_marker("unsupported: bskyPost"),
        BlockBlock::Page(_) => comment_marker("unsupported: page"),
        BlockBlock::Poll(_) => comment_marker("unsupported: poll"),
        BlockBlock::Button(_) => comment_marker("unsupported: button"),
        _ => comment_marker("unsupported: unknown block"),
    };

    Ok(match &block.alignment {
        // Some(alignment) if !alignment.is_empty() => format!("<!-- alignment: {} -->\n{}", alignment, body),
        Some(alignment) => match alignment {
            BlockAlignment::TextAlignCenter => format!("<!-- alignment: center; -->\n{}", body),
            BlockAlignment::TextAlignLeft => format!("<!-- alignment: left; -->\n{}", body),
            BlockAlignment::TextAlignRight => format!("<!-- alignment: right; -->\n{}", body),
            _ => body,
        },
        None => body,
    })
}

fn render_code_block(code: &Code<'_>) -> String {
    match code.language.as_deref().filter(|value| !value.is_empty()) {
        Some(language) => format!("```{}\n{}\n```", language, code.plaintext),
        None => format!("```\n{}\n```", code.plaintext),
    }
}

fn render_image(image: &Image<'_>) -> String {
    let alt = image.alt.as_deref().unwrap_or_default();
    format!("![{}](at://blob/{})", alt, image.image.blob().r#ref.as_str())
}

fn render_list_items(items: &[ListItem<'_>], depth: usize) -> Result<String, AppError> {
    let mut lines = Vec::new();

    for item in items {
        let indent = "  ".repeat(depth);
        let content = render_list_item_content(&item.content)?;
        let mut content_lines = content.lines();

        if let Some(first_line) = content_lines.next() {
            lines.push(format!("{}- {}", indent, first_line));
        } else {
            lines.push(format!("{}-", indent));
        }

        for line in content_lines {
            lines.push(format!("{}  {}", indent, line));
        }

        if let Some(children) = &item.children {
            lines.push(render_list_items(children, depth + 1)?);
        }
    }

    Ok(lines.join("\n"))
}

fn render_list_item_content(content: &ListItemContent<'_>) -> Result<String, AppError> {
    match content {
        ListItemContent::Text(text) => render_rich_text(&text.plaintext, text.facets.as_deref()),
        ListItemContent::Header(header) => {
            let level = header.level.unwrap_or(1).clamp(1, 6) as usize;
            Ok(format!(
                "{} {}",
                "#".repeat(level),
                render_rich_text(&header.plaintext, header.facets.as_deref())?
            ))
        }
        ListItemContent::Image(image) => Ok(render_image(image)),
        _ => Ok(comment_marker("unsupported: unknown list item")),
    }
}

fn render_rich_text(plaintext: &str, facets: Option<&[Facet<'_>]>) -> Result<String, AppError> {
    let Some(facets) = facets else {
        return Ok(plaintext.to_string());
    };

    let mut openings = vec![Vec::<Marker>::new(); plaintext.len() + 1];
    let mut closings = vec![Vec::<Marker>::new(); plaintext.len() + 1];

    for facet in facets {
        let start = usize::try_from(facet.index.byte_start)
            .map_err(|_| AppError::new(ErrorCode::Parse, "Facet start was negative"))?;
        let end = usize::try_from(facet.index.byte_end)
            .map_err(|_| AppError::new(ErrorCode::Parse, "Facet end was negative"))?;

        if start >= end
            || end > plaintext.len()
            || !plaintext.is_char_boundary(start)
            || !plaintext.is_char_boundary(end)
        {
            return Err(AppError::new(
                ErrorCode::Parse,
                format!(
                    "Invalid facet range {}..{} for text of length {}",
                    start,
                    end,
                    plaintext.len()
                ),
            ));
        }

        for feature in &facet.features {
            if let Some((rank, open, close)) = facet_markers(feature)? {
                openings[start].push(Marker { rank, start, end, text: open });
                closings[end].push(Marker { rank, start, end, text: close });
            }
        }
    }

    for markers in &mut openings {
        markers.sort_by_key(|marker| (marker.rank, Reverse(marker.end), marker.start));
    }
    for markers in &mut closings {
        markers.sort_by_key(|marker| (Reverse(marker.rank), Reverse(marker.start), marker.end));
    }

    let mut output = String::new();
    let mut boundaries = plaintext.char_indices().map(|(index, _)| index).collect::<Vec<_>>();
    boundaries.push(plaintext.len());

    for window in boundaries.windows(2) {
        let position = window[0];
        let next = window[1];

        for marker in &closings[position] {
            output.push_str(&marker.text);
        }
        for marker in &openings[position] {
            output.push_str(&marker.text);
        }
        output.push_str(&plaintext[position..next]);
    }

    for marker in &closings[plaintext.len()] {
        output.push_str(&marker.text);
    }

    Ok(output)
}

fn facet_markers(feature: &FacetFeaturesItem<'_>) -> Result<Option<(u8, String, String)>, AppError> {
    let value = match feature {
        FacetFeaturesItem::Link(link) => Some((0, "[".to_string(), format!("]({})", link.uri))),
        FacetFeaturesItem::DidMention(mention) => Some((0, "[".to_string(), format!("](at://{})", mention.did))),
        FacetFeaturesItem::AtMention(mention) => Some((0, "[".to_string(), format!("]({})", mention.at_uri.as_str()))),
        FacetFeaturesItem::Bold(_) => Some((1, "**".to_string(), "**".to_string())),
        FacetFeaturesItem::Italic(_) => Some((2, "*".to_string(), "*".to_string())),
        FacetFeaturesItem::Strikethrough(_) => Some((3, "~~".to_string(), "~~".to_string())),
        FacetFeaturesItem::Code(_) => Some((4, "`".to_string(), "`".to_string())),
        FacetFeaturesItem::Underline(_) | FacetFeaturesItem::Highlight(_) | FacetFeaturesItem::Id(_) => None,
        _ => None,
    };

    Ok(value)
}

fn markdown_node_to_block<'a>(node: &'a AstNode<'a>) -> Result<Option<Block<'static>>, AppError> {
    match &node.data().value {
        NodeValue::Paragraph => paragraph_to_block(node),
        NodeValue::Heading(NodeHeading { level, .. }) => {
            let inline = collect_inline(node)?;
            Ok(Some(wrap_block(BlockBlock::Header(Box::new(Header {
                facets: option_facets(inline.facets),
                level: Some(i64::from(*level)),
                plaintext: inline.plaintext.into(),
                extra_data: Default::default(),
            })))))
        }
        NodeValue::BlockQuote | NodeValue::MultilineBlockQuote(_) => {
            let inline = collect_blockquote(node)?;
            Ok(Some(wrap_block(BlockBlock::Blockquote(Box::new(Blockquote {
                facets: option_facets(inline.facets),
                plaintext: inline.plaintext.into(),
                extra_data: Default::default(),
            })))))
        }
        NodeValue::CodeBlock(code_block) => Ok(Some(wrap_block(BlockBlock::Code(Box::new(Code {
            language: parse_code_language(code_block).map(Into::into),
            plaintext: code_block.literal.clone().into(),
            syntax_highlighting_theme: None,
            extra_data: Default::default(),
        }))))),
        NodeValue::List(_) => Ok(Some(wrap_block(BlockBlock::UnorderedList(Box::new(
            UnorderedList::new().children(convert_list_items(node)?).build(),
        ))))),
        NodeValue::ThematicBreak => Ok(Some(wrap_block(BlockBlock::HorizontalRule(Box::new(
            HorizontalRule::default(),
        ))))),
        NodeValue::HtmlBlock(_)
        | NodeValue::Table(_)
        | NodeValue::DescriptionList
        | NodeValue::DescriptionItem(_)
        | NodeValue::DescriptionTerm
        | NodeValue::DescriptionDetails
        | NodeValue::FootnoteDefinition(_)
        | NodeValue::Alert(_)
        | NodeValue::Subtext => Ok(Some(text_comment_block(format!(
            "unsupported markdown block: {}",
            node.data().value.xml_node_name()
        )))),
        _ => Ok(None),
    }
}

fn paragraph_to_block<'a>(node: &'a AstNode<'a>) -> Result<Option<Block<'static>>, AppError> {
    if let Some(math) = paragraph_math_block(node)? {
        return Ok(Some(math));
    }
    if let Some(image) = paragraph_image_block(node)? {
        return Ok(Some(image));
    }

    let inline = collect_inline(node)?;
    if inline.plaintext.is_empty() {
        return Ok(None);
    }

    Ok(Some(wrap_block(BlockBlock::Text(Box::new(Text {
        facets: option_facets(inline.facets),
        plaintext: inline.plaintext.into(),
        ..Default::default()
    })))))
}

fn paragraph_math_block<'a>(node: &'a AstNode<'a>) -> Result<Option<Block<'static>>, AppError> {
    let mut children = node.children();
    let Some(child) = children.next() else {
        return Ok(None);
    };
    if children.next().is_some() {
        return Ok(None);
    }

    let NodeValue::Math(NodeMath { literal, .. }) = &child.data().value else {
        return Ok(None);
    };

    Ok(Some(wrap_block(BlockBlock::Math(Box::new(Math {
        tex: literal.clone().into(),
        extra_data: Default::default(),
    })))))
}

fn paragraph_image_block<'a>(node: &'a AstNode<'a>) -> Result<Option<Block<'static>>, AppError> {
    let mut children = node.children();
    let Some(child) = children.next() else {
        return Ok(None);
    };
    if children.next().is_some() {
        return Ok(None);
    }

    let NodeValue::Image(link) = &child.data().value else {
        return Ok(None);
    };

    if let Some(image) = image_from_url(link.url.as_str(), extract_text(child))? {
        return Ok(Some(wrap_block(BlockBlock::Image(Box::new(image)))));
    }

    Ok(Some(text_comment_block(format!(
        "unsupported markdown image: {}",
        link.url
    ))))
}

fn image_from_url(url: &str, alt: String) -> Result<Option<Image<'static>>, AppError> {
    let Some(cid) = url.strip_prefix("at://blob/") else {
        return Ok(None);
    };

    Ok(Some(
        Image::new()
            .image(BlobRef::Blob(Blob {
                r#ref: CidLink::cow_str(cid.to_string().into()),
                mime_type: MimeType::new_static("application/octet-stream"),
                size: 0,
            }))
            .aspect_ratio(AspectRatio::new().width(1).height(1).build())
            .alt(if alt.is_empty() { None } else { Some(alt.into()) })
            .build(),
    ))
}

fn convert_list_items<'a>(list_node: &'a AstNode<'a>) -> Result<Vec<ListItem<'static>>, AppError> {
    let mut items = Vec::new();

    for item in list_node.children() {
        if !matches!(item.data().value, NodeValue::Item(_)) {
            continue;
        }

        let mut content = None;
        let mut children = Vec::new();

        for child in item.children() {
            match &child.data().value {
                NodeValue::Paragraph => {
                    if content.is_none() {
                        content = Some(list_item_content_from_paragraph(child)?);
                    }
                }
                NodeValue::Heading(NodeHeading { level, .. }) => {
                    if content.is_none() {
                        let inline = collect_inline(child)?;
                        content = Some(ListItemContent::Header(Box::new(Header {
                            facets: option_facets(inline.facets),
                            level: Some(i64::from(*level)),
                            plaintext: inline.plaintext.into(),
                            extra_data: Default::default(),
                        })));
                    }
                }
                NodeValue::List(_) => children.extend(convert_list_items(child)?),
                _ => {
                    if content.is_none() {
                        content = Some(ListItemContent::Text(Box::new(Text {
                            facets: None,
                            plaintext: format!(
                                "<!-- unsupported list content: {} -->",
                                child.data().value.xml_node_name()
                            )
                            .into(),
                            ..Default::default()
                        })));
                    }
                }
            }
        }

        let content = content.unwrap_or_else(|| {
            ListItemContent::Text(Box::new(Text {
                facets: None,
                plaintext: String::new().into(),
                ..Default::default()
            }))
        });

        items.push(
            ListItem::new()
                .content(content)
                .children(if children.is_empty() { None } else { Some(children) })
                .build(),
        );
    }

    Ok(items)
}

fn list_item_content_from_paragraph<'a>(node: &'a AstNode<'a>) -> Result<ListItemContent<'static>, AppError> {
    if let Some(image_block) = paragraph_image_block(node)?
        && let BlockBlock::Image(image) = image_block.block
    {
        Ok(ListItemContent::Image(image))
    } else {
        let inline = collect_inline(node)?;
        Ok(ListItemContent::Text(Box::new(Text {
            facets: option_facets(inline.facets),
            plaintext: inline.plaintext.into(),
            ..Default::default()
        })))
    }
}

#[derive(Default)]
struct InlineOutput {
    plaintext: String,
    facets: Vec<Facet<'static>>,
}

fn collect_inline<'a>(node: &'a AstNode<'a>) -> Result<InlineOutput, AppError> {
    let mut output = InlineOutput::default();
    for child in node.children() {
        collect_inline_node(child, &mut output)?;
    }
    Ok(output)
}

fn collect_inline_node<'a>(node: &'a AstNode<'a>, output: &mut InlineOutput) -> Result<(), AppError> {
    match &node.data().value {
        NodeValue::Text(text) => output.plaintext.push_str(text),
        NodeValue::SoftBreak | NodeValue::LineBreak => output.plaintext.push('\n'),
        NodeValue::Code(code) => {
            let start = output.plaintext.len();
            output.plaintext.push_str(&code.literal);
            push_facet(output, start, feature_code())?;
        }
        NodeValue::Math(NodeMath { literal, .. }) => {
            let start = output.plaintext.len();
            output.plaintext.push_str(literal);
            push_facet(output, start, feature_code())?;
        }
        NodeValue::Emph => {
            let start = output.plaintext.len();
            collect_children(node, output)?;
            push_facet(output, start, feature_italic())?;
        }
        NodeValue::Strong => {
            let start = output.plaintext.len();
            collect_children(node, output)?;
            push_facet(output, start, feature_bold())?;
        }
        NodeValue::Strikethrough => {
            let start = output.plaintext.len();
            collect_children(node, output)?;
            push_facet(output, start, feature_strikethrough())?;
        }
        NodeValue::Link(link) => {
            let start = output.plaintext.len();
            collect_children(node, output)?;
            push_facet(output, start, feature_link(&link.url)?)?;
        }
        NodeValue::WikiLink(link) => {
            let start = output.plaintext.len();
            output.plaintext.push_str(&extract_text(node));
            push_facet(output, start, feature_link(&link.url)?)?;
        }
        NodeValue::Image(_) => output.plaintext.push_str(&extract_text(node)),
        NodeValue::HtmlInline(html) | NodeValue::Raw(html) => output.plaintext.push_str(html),
        NodeValue::FootnoteReference(reference) => {
            output.plaintext.push_str(&format!("[^{}]", reference.name));
        }
        NodeValue::Underline
        | NodeValue::Highlight
        | NodeValue::Superscript
        | NodeValue::Subscript
        | NodeValue::SpoileredText
        | NodeValue::Escaped
        | NodeValue::EscapedTag(_) => collect_children(node, output)?,
        _ => collect_children(node, output)?,
    }

    Ok(())
}

fn collect_children<'a>(node: &'a AstNode<'a>, output: &mut InlineOutput) -> Result<(), AppError> {
    for child in node.children() {
        collect_inline_node(child, output)?;
    }
    Ok(())
}

fn collect_blockquote<'a>(node: &'a AstNode<'a>) -> Result<InlineOutput, AppError> {
    let mut output = InlineOutput::default();
    let mut first = true;

    for child in node.children() {
        match &child.data().value {
            NodeValue::Paragraph | NodeValue::Heading(_) => {
                let inline = collect_inline(child)?;
                if !first {
                    append_plaintext(&mut output, "\n");
                }
                append_inline_output(&mut output, inline);
                first = false;
            }
            NodeValue::List(_) => {
                let rendered = render_list_items(&convert_list_items(child)?, 0)?;
                if !first {
                    append_plaintext(&mut output, "\n");
                }
                append_plaintext(&mut output, &rendered);
                first = false;
            }
            _ => {}
        }
    }

    Ok(output)
}

fn append_inline_output(target: &mut InlineOutput, mut incoming: InlineOutput) {
    let offset = target.plaintext.len();
    target.plaintext.push_str(&incoming.plaintext);
    for facet in &mut incoming.facets {
        facet.index.byte_start += offset as i64;
        facet.index.byte_end += offset as i64;
    }
    target.facets.extend(incoming.facets);
}

fn append_plaintext(target: &mut InlineOutput, text: &str) {
    target.plaintext.push_str(text);
}

fn push_facet(output: &mut InlineOutput, start: usize, feature: FacetFeaturesItem<'static>) -> Result<(), AppError> {
    let end = output.plaintext.len();
    if end <= start {
        return Ok(());
    }

    output.facets.push(
        Facet::new()
            .features(vec![feature])
            .index(
                ByteSlice::new()
                    .byte_start(
                        i64::try_from(start)
                            .map_err(|_| AppError::new(ErrorCode::Parse, "Facet start offset overflowed i64"))?,
                    )
                    .byte_end(
                        i64::try_from(end)
                            .map_err(|_| AppError::new(ErrorCode::Parse, "Facet end offset overflowed i64"))?,
                    )
                    .build(),
            )
            .build(),
    );
    Ok(())
}

fn feature_bold() -> FacetFeaturesItem<'static> {
    FacetFeaturesItem::Bold(Box::new(Bold::default()))
}

fn feature_italic() -> FacetFeaturesItem<'static> {
    FacetFeaturesItem::Italic(Box::new(Italic::default()))
}

fn feature_strikethrough() -> FacetFeaturesItem<'static> {
    FacetFeaturesItem::Strikethrough(Box::new(Strikethrough::default()))
}

fn feature_code() -> FacetFeaturesItem<'static> {
    FacetFeaturesItem::Code(Box::new(CodeFacet::default()))
}

fn feature_link(url: &str) -> Result<FacetFeaturesItem<'static>, AppError> {
    if let Some(did) = url.strip_prefix("at://did:") {
        let did = Did::new_owned(format!("did:{}", did))
            .map_err(|error| AppError::new(ErrorCode::Parse, format!("Invalid DID mention: {}", error)))?;
        return Ok(FacetFeaturesItem::DidMention(Box::new(
            DidMention::new().did(did).build(),
        )));
    }

    if url.starts_with("at://") {
        let uri = AtUri::new_owned(url)
            .map_err(|error| AppError::new(ErrorCode::Parse, format!("Invalid at:// mention URI: {}", error)))?;
        return Ok(FacetFeaturesItem::AtMention(Box::new(
            AtMention::new().at_uri(UriValue::At(uri)).build(),
        )));
    }

    Ok(FacetFeaturesItem::Link(Box::new(Link {
        uri: url.to_string().into(),
        extra_data: Default::default(),
    })))
}

fn parse_code_language(code_block: &NodeCodeBlock) -> Option<String> {
    code_block
        .info
        .split_whitespace()
        .next()
        .map(ToString::to_string)
        .filter(|value| !value.is_empty())
}

fn option_facets(facets: Vec<Facet<'static>>) -> Option<Vec<Facet<'static>>> {
    if facets.is_empty() { None } else { Some(facets) }
}

fn wrap_block(block: BlockBlock<'static>) -> Block<'static> {
    Block::new().block(block).build()
}

fn text_comment_block(message: String) -> Block<'static> {
    wrap_block(BlockBlock::Text(Box::new(Text {
        facets: None,
        plaintext: format!("<!-- {} -->", message).into(),
        ..Default::default()
    })))
}

fn prefix_lines(text: &str, prefix: &str) -> String {
    text.lines()
        .map(|line| format!("{}{}", prefix, line))
        .collect::<Vec<_>>()
        .join("\n")
}

fn comment_marker(label: &str) -> String {
    format!("<!-- {} -->", label)
}

fn extract_text<'a>(node: &'a AstNode<'a>) -> String {
    let mut text = String::new();
    for child in node.children() {
        match &child.data().value {
            NodeValue::Text(value) => text.push_str(value),
            NodeValue::Code(code) => text.push_str(&code.literal),
            _ => text.push_str(&extract_text(child)),
        }
    }
    text
}

#[derive(Clone)]
struct Marker {
    rank: u8,
    start: usize,
    end: usize,
    text: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use jacquard::api::pub_leaflet::{blocks::iframe::Iframe, pages::canvas::Canvas};

    #[test]
    fn leaflet_document_renders_supported_blocks_and_markers() {
        let document = Document::new()
            .author(AtIdentifier::new("did:plc:testauthor").unwrap())
            .title("Post")
            .pages(vec![
                DocumentPagesItem::LinearDocument(Box::new(
                    LinearDocument::new()
                        .blocks(vec![
                            wrap_block(BlockBlock::Header(Box::new(Header {
                                facets: Some(vec![single_feature_facet(0, 7, feature_bold())]),
                                level: Some(2),
                                plaintext: "Heading".into(),
                                extra_data: Default::default(),
                            }))),
                            wrap_block(BlockBlock::Text(Box::new(Text {
                                facets: Some(vec![
                                    single_feature_facet(0, 4, feature_italic()),
                                    single_feature_facet(5, 9, feature_link("https://example.com").unwrap()),
                                ]),
                                plaintext: "Lead link".into(),
                                ..Default::default()
                            }))),
                            wrap_block(BlockBlock::Blockquote(Box::new(Blockquote {
                                facets: None,
                                plaintext: "Quoted".into(),
                                extra_data: Default::default(),
                            }))),
                            wrap_block(BlockBlock::Code(Box::new(Code {
                                language: Some("rust".into()),
                                plaintext: "fn main() {}".into(),
                                syntax_highlighting_theme: None,
                                extra_data: Default::default(),
                            }))),
                            wrap_block(BlockBlock::UnorderedList(Box::new(
                                UnorderedList::new()
                                    .children(vec![list_item_text("Top", Some(vec![list_item_text("Nested", None)]))])
                                    .build(),
                            ))),
                            wrap_block(BlockBlock::Math(Box::new(Math {
                                tex: "x^2".into(),
                                extra_data: Default::default(),
                            }))),
                            wrap_block(BlockBlock::HorizontalRule(Box::new(HorizontalRule::default()))),
                            wrap_block(BlockBlock::Image(Box::new(
                                Image::new()
                                    .image(blob_ref())
                                    .aspect_ratio(AspectRatio::new().width(4).height(3).build())
                                    .alt(Some("alt text".into()))
                                    .build(),
                            ))),
                            wrap_block(BlockBlock::Iframe(Box::new(
                                Iframe::new()
                                    .url(UriValue::Https(
                                        jacquard::deps::fluent_uri::Uri::parse("https://example.com/embed".to_string())
                                            .expect("Invalid URI"),
                                    ))
                                    .build(),
                            ))),
                        ])
                        .build(),
                )),
                DocumentPagesItem::Canvas(Box::new(Canvas::new().blocks(vec![]).build())),
            ])
            .build();

        let markdown = leaflet_document_to_markdown(&document).unwrap();

        assert!(markdown.contains("## **Heading**"));
        assert!(markdown.contains("*Lead* [link](https://example.com)"));
        assert!(markdown.contains("> Quoted"));
        assert!(markdown.contains("```rust\nfn main() {}\n```"));
        assert!(markdown.contains("- Top\n  - Nested"));
        assert!(markdown.contains("$$\nx^2\n$$"));
        assert!(markdown.contains("---"));
        assert!(markdown.contains("![alt text](at://blob/"));
        assert!(markdown.contains("<!-- unsupported: iframe -->"));
        assert!(markdown.contains(CANVAS_PAGE_OMITTED));
    }

    #[test]
    fn markdown_document_builds_leaflet_blocks_with_facets() {
        let markdown = "# Title\n\nParagraph with **bold**, *italic*, ~~strike~~, `code`, and [link](https://example.com).\n\n> Quote\n\n1. one\n2. two\n\n```ts\nconst x = 1;\n```\n\n$$a+b$$\n\n---";
        let document = markdown_to_leaflet_document(markdown, "Post", "did:plc:testauthor").unwrap();

        let DocumentPagesItem::LinearDocument(page) = &document.pages[0] else {
            panic!("expected linear page");
        };

        assert!(matches!(page.blocks[0].block, BlockBlock::Header(_)));
        assert!(matches!(page.blocks[1].block, BlockBlock::Text(_)));
        assert!(matches!(page.blocks[2].block, BlockBlock::Blockquote(_)));
        assert!(matches!(page.blocks[3].block, BlockBlock::UnorderedList(_)));
        assert!(matches!(page.blocks[4].block, BlockBlock::Code(_)));
        assert!(matches!(page.blocks[5].block, BlockBlock::Math(_)));
        assert!(matches!(page.blocks[6].block, BlockBlock::HorizontalRule(_)));

        let BlockBlock::Text(paragraph) = &page.blocks[1].block else {
            panic!("expected paragraph block");
        };
        assert_eq!(
            paragraph.plaintext,
            "Paragraph with bold, italic, strike, code, and link."
        );

        let facets = paragraph.facets.as_ref().unwrap();
        assert!(
            facets
                .iter()
                .any(|facet| matches!(facet.features[0], FacetFeaturesItem::Bold(_)))
        );
        assert!(
            facets
                .iter()
                .any(|facet| matches!(facet.features[0], FacetFeaturesItem::Italic(_)))
        );
        assert!(
            facets
                .iter()
                .any(|facet| matches!(facet.features[0], FacetFeaturesItem::Strikethrough(_)))
        );
        assert!(
            facets
                .iter()
                .any(|facet| matches!(facet.features[0], FacetFeaturesItem::Code(_)))
        );
        assert!(
            facets
                .iter()
                .any(|facet| matches!(facet.features[0], FacetFeaturesItem::Link(_)))
        );
    }

    #[test]
    fn markdown_round_trip_keeps_supported_content() {
        let markdown = "## Heading\n\nPlain **bold** text.\n\n- Parent\n  - Child\n\n> Quote\n\n```rs\nfn test() {}\n```\n\n$$x+y$$\n\n---";
        let document = markdown_to_leaflet_document(markdown, "Post", "did:plc:testauthor").unwrap();
        let rendered = leaflet_document_to_markdown(&document).unwrap();

        assert!(rendered.contains("## Heading"));
        assert!(rendered.contains("Plain **bold** text."));
        assert!(rendered.contains("- Parent\n  - Child"));
        assert!(rendered.contains("> Quote"));
        assert!(rendered.contains("fn test() {}"));
        assert!(rendered.contains("```"));
        assert!(rendered.contains("$$\nx+y\n$$"));
        assert!(rendered.contains("---"));
    }

    fn single_feature_facet(start: usize, end: usize, feature: FacetFeaturesItem<'static>) -> Facet<'static> {
        Facet::new()
            .features(vec![feature])
            .index(ByteSlice::new().byte_start(start as i64).byte_end(end as i64).build())
            .build()
    }

    fn list_item_text(text: &str, children: Option<Vec<ListItem<'static>>>) -> ListItem<'static> {
        ListItem::new()
            .content(ListItemContent::Text(Box::new(Text {
                facets: None,
                plaintext: text.to_string().into(),
                ..Default::default()
            })))
            .children(children)
            .build()
    }

    fn blob_ref() -> BlobRef<'static> {
        BlobRef::Blob(Blob {
            r#ref: CidLink::str("bafkreigh2akiscaildcw453s4h4u2z2k2p4g6m3uz4x7g5qj5qg4xk6b2e"),
            mime_type: MimeType::new_static("image/png"),
            size: 42,
        })
    }
}
