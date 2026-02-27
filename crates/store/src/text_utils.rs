use std::hash::{Hash, Hasher};

use writer_core::{AppError, Encoding, SearchMatch};

pub fn hash_text(text: &str) -> String {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    text.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

pub fn extract_highlight_matches(snippet: &str) -> (String, Vec<SearchMatch>) {
    let mut plain = String::new();
    let mut matches = Vec::new();
    let mut start_index: Option<usize> = None;

    let mut i = 0usize;
    while i < snippet.len() {
        if snippet[i..].starts_with("<<") {
            start_index = Some(plain.len());
            i += 2;
            continue;
        }

        if snippet[i..].starts_with(">>") {
            if let Some(start) = start_index.take() {
                matches.push(SearchMatch { start, end: plain.len() });
            }
            i += 2;
            continue;
        }

        if let Some(ch) = snippet[i..].chars().next() {
            plain.push(ch);
            i += ch.len_utf8();
        } else {
            break;
        }
    }

    (plain, matches)
}

/// Detects encoding from byte BOM and decodes to string
pub fn detect_and_decode(bytes: &[u8]) -> Result<(String, Encoding), AppError> {
    if bytes.starts_with(&[0xef, 0xbb, 0xbf]) {
        let text = String::from_utf8_lossy(&bytes[3..]).into_owned();
        Ok((text, Encoding::Utf8WithBom))
    } else if bytes.starts_with(&[0xff, 0xfe]) {
        let u16_vec: Vec<u16> = bytes[2..]
            .chunks_exact(2)
            .map(|c| u16::from_le_bytes([c[0], c[1]]))
            .collect();
        let text = String::from_utf16(&u16_vec).map_err(|e| AppError::io(format!("Invalid UTF-16 LE: {}", e)))?;
        Ok((text, Encoding::Utf16Le))
    } else if bytes.starts_with(&[0xfe, 0xff]) {
        let u16_vec: Vec<u16> = bytes[2..]
            .chunks_exact(2)
            .map(|c| u16::from_be_bytes([c[0], c[1]]))
            .collect();
        let text = String::from_utf16(&u16_vec).map_err(|e| AppError::io(format!("Invalid UTF-16 BE: {}", e)))?;
        Ok((text, Encoding::Utf16Be))
    } else {
        let text = String::from_utf8_lossy(bytes).into_owned();
        Ok((text, Encoding::Utf8))
    }
}

pub fn locate_query_position(content: &str, query: &str) -> (usize, usize) {
    let term = query
        .split_whitespace()
        .find(|token| !matches!(token.to_ascii_uppercase().as_str(), "AND" | "OR" | "NOT"))
        .unwrap_or(query)
        .trim_matches('"')
        .to_lowercase();

    if term.is_empty() {
        return (1, 1);
    }

    let content_lower = content.to_lowercase();
    if let Some(byte_index) = content_lower.find(&term) {
        let prefix = &content[..byte_index];
        let line = prefix.matches('\n').count() + 1;
        let column = prefix
            .rsplit_once('\n')
            .map(|(_, tail)| tail.chars().count() + 1)
            .unwrap_or_else(|| prefix.chars().count() + 1);
        (line, column)
    } else {
        (1, 1)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hash_text_is_stable() {
        assert_eq!(hash_text("hello"), hash_text("hello"));
        assert_ne!(hash_text("hello"), hash_text("goodbye"));
    }
}
