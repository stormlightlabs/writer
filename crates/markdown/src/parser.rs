use super::{DocumentMetadata, FrontMatter, FrontMatterFormat, Heading, LinkRef, TaskStats, utils};
use comrak::nodes::NodeValue;
use serde_yaml::Value as YamlValue;
use std::collections::HashMap;
use toml::Value as TomlValue;

pub struct MarkdownParser;

impl MarkdownParser {
    fn yaml_scalar_to_string(value: &YamlValue) -> Option<String> {
        match value {
            YamlValue::String(text) => Some(text.clone()),
            YamlValue::Bool(boolean) => Some(boolean.to_string()),
            YamlValue::Number(number) => Some(number.to_string()),
            YamlValue::Null => Some("null".to_string()),
            _ => None,
        }
    }

    fn toml_scalar_to_string(value: &TomlValue) -> Option<String> {
        match value {
            TomlValue::String(text) => Some(text.clone()),
            TomlValue::Integer(number) => Some(number.to_string()),
            TomlValue::Float(number) => Some(number.to_string()),
            TomlValue::Boolean(boolean) => Some(boolean.to_string()),
            TomlValue::Datetime(datetime) => Some(datetime.to_string()),
            _ => None,
        }
    }

    /// Parses YAML-like front matter into key-value pairs
    pub fn parse_yaml_like_front_matter(content: &str) -> HashMap<String, String> {
        let mut fields = HashMap::new();

        if let Ok(parsed) = serde_yaml::from_str::<YamlValue>(content)
            && let YamlValue::Mapping(mapping) = parsed
        {
            for (key, value) in mapping {
                let Some(key_text) = key.as_str() else {
                    continue;
                };
                let Some(value_text) = Self::yaml_scalar_to_string(&value) else {
                    continue;
                };
                if !key_text.is_empty() {
                    fields.insert(key_text.to_string(), value_text);
                }
            }
        }

        fields
    }

    /// Parses TOML-like front matter into key-value pairs
    pub fn parse_toml_like_front_matter(content: &str) -> HashMap<String, String> {
        let mut fields = HashMap::new();

        if let Ok(table) = toml::from_str::<toml::Table>(content) {
            for (key, value) in table {
                let Some(value_text) = Self::toml_scalar_to_string(&value) else {
                    continue;
                };
                if !key.is_empty() {
                    fields.insert(key.to_string(), value_text);
                }
            }
        }

        fields
    }

    /// Extracts front matter from the beginning of the document
    ///
    /// Supports YAML (---) and TOML (+++) front matter delimiters
    pub fn extract_front_matter(text: &str) -> (&str, FrontMatter) {
        let trimmed = text.trim_start();

        if let Some(rest) = trimmed.strip_prefix("---")
            && let Some(end_pos) = rest.find("\n---")
        {
            let fm_content = &rest[..end_pos];
            let delimiter_end = end_pos + "\n---".len();
            let body = rest[delimiter_end..]
                .strip_prefix('\n')
                .map_or(&rest[delimiter_end..], |value| value);

            let fields = MarkdownParser::parse_yaml_like_front_matter(fm_content);

            return (
                body,
                FrontMatter { raw: Some(fm_content.to_string()), format: Some(FrontMatterFormat::Yaml), fields },
            );
        }

        if let Some(rest) = trimmed.strip_prefix("+++")
            && let Some(end_pos) = rest.find("\n+++")
        {
            let fm_content = &rest[..end_pos];
            let delimiter_end = end_pos + "\n+++".len();
            let body = rest[delimiter_end..]
                .strip_prefix('\n')
                .map_or(&rest[delimiter_end..], |value| value);

            let fields = MarkdownParser::parse_toml_like_front_matter(fm_content);

            return (
                body,
                FrontMatter { raw: Some(fm_content.to_string()), format: Some(FrontMatterFormat::Toml), fields },
            );
        }

        (text, FrontMatter::default())
    }

    /// Extracts metadata by traversing the AST
    pub fn extract_metadata_from_node<'a>(
        node: &'a comrak::nodes::AstNode<'a>, metadata: &mut DocumentMetadata, first_h1: &mut bool,
    ) {
        match &node.data.borrow().value {
            NodeValue::Heading(heading) => {
                let level = heading.level;
                let text = Self::extract_text_from_node(node);

                if level == 1 && *first_h1 {
                    metadata.title = Some(text.clone());
                    *first_h1 = false;
                }

                metadata.outline.push(Heading { level, text, anchor: None });
            }
            NodeValue::Link(link) => {
                metadata.links.push(LinkRef {
                    url: link.url.clone(),
                    title: if link.title.is_empty() { None } else { Some(link.title.clone()) },
                });
            }
            NodeValue::TaskItem(task_item) => {
                metadata.task_items.total += 1;
                if let Some(symbol) = task_item.symbol
                    && (symbol == 'x' || symbol == 'X')
                {
                    metadata.task_items.completed += 1;
                }
            }
            _ => {}
        }

        for child in node.children() {
            Self::extract_metadata_from_node(child, metadata, first_h1);
        }
    }

    /// Extracts plain text from a node and its children
    fn extract_text_from_node<'a>(node: &'a comrak::nodes::AstNode<'a>) -> String {
        let mut text = String::new();

        match &node.data.borrow().value {
            NodeValue::Text(t) => {
                text.push_str(t);
            }
            NodeValue::Code(code) => {
                text.push_str(&code.literal);
            }
            _ => {
                for child in node.children() {
                    text.push_str(&Self::extract_text_from_node(child));
                }
            }
        }

        text
    }

    pub fn build_metadata<'a>(
        root: &'a comrak::nodes::AstNode<'a>, body_text: &str, front_matter: FrontMatter,
    ) -> DocumentMetadata {
        let mut metadata = DocumentMetadata {
            title: None,
            outline: Vec::new(),
            links: Vec::new(),
            task_items: TaskStats::default(),
            word_count: 0,
            front_matter,
        };

        MarkdownParser::extract_metadata_from_node(root, &mut metadata, &mut true);

        if let Some(title) = metadata.front_matter.fields.get("title") {
            metadata.title = Some(title.clone());
        }

        metadata.word_count = utils::estimate_word_count(body_text);
        metadata
    }
}
