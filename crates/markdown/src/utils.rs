/// Estimates word count from Markdown text
///
/// This is a simple estimation that counts whitespace-separated tokens
pub fn estimate_word_count(text: &str) -> usize {
    text.split_whitespace().filter(|s| !s.is_empty()).count()
}

/// Validates that HTML output contains source position attributes
#[cfg(test)]
pub fn has_sourcepos(html: &str) -> bool {
    html.contains("data-sourcepos")
}

/// Escapes HTML special characters
pub fn html_escape(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#x27;")
}
