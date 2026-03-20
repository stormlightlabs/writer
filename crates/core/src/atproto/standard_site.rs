use crate::{AppError, ErrorCode};
use jacquard::IntoStatic;
use jacquard::api::com_atproto::repo::{get_record::GetRecord, list_records::ListRecords};
use jacquard::api::pub_leaflet::{
    content::{Content as LeafletContent, ContentPagesItem},
    document::{Document as LeafletDocument, DocumentPagesItem},
};
use jacquard::api::site_standard::{document::Document as StandardSiteDocument, publication::Publication};
use jacquard::common::CowStr;
use jacquard::common::types::value::{Data, from_data};
use jacquard::common::types::{collection::Collection, ident::AtIdentifier, recordkey::RecordKey, string::AtUri};
use jacquard::types::did::Did;
use jacquard::xrpc::XrpcExt;
use serde::Serialize;

use super::leaflet::leaflet_document_to_markdown;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicationRecord {
    pub uri: String,
    pub tid: String,
    pub name: String,
    pub description: String,
    pub url: String,
}

impl PublicationRecord {
    fn from_publication(uri: &str, value: Publication<'_>) -> Option<Self> {
        Some(Self {
            uri: uri.to_string(),
            tid: record_key_from_uri(uri)?,
            name: value.name.to_string(),
            description: cow_str_option_to_string(value.description),
            url: value.url.as_str().to_string(),
        })
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PostRecord {
    pub uri: String,
    pub tid: String,
    pub title: String,
    pub description: String,
    pub text_content: String,
    pub published_at: String,
    pub updated_at: String,
    pub tags: Vec<String>,
    pub publication_uri: String,
}

impl PostRecord {
    fn from_document(uri: &str, value: StandardSiteDocument<'_>) -> Option<Self> {
        Some(Self {
            uri: uri.to_string(),
            tid: record_key_from_uri(uri)?,
            title: value.title.to_string(),
            description: cow_str_option_to_string(value.description),
            text_content: cow_str_option_to_string(value.text_content),
            published_at: value.published_at.to_string(),
            updated_at: value.updated_at.map(|value| value.to_string()).unwrap_or_default(),
            tags: value
                .tags
                .unwrap_or_default()
                .into_iter()
                .map(|value| value.to_string())
                .collect(),
            publication_uri: value.site.as_str().to_string(),
        })
    }
}

impl super::auth::AtProtoState {
    pub async fn publication_list(&self, did_or_handle: &str) -> Result<Vec<PublicationRecord>, AppError> {
        let publications = self
            .list_records(did_or_handle, Publication::nsid(), "Standard.Site publications")
            .await?;

        publications
            .into_iter()
            .map(|(uri, data)| {
                let publication = parse_publication(&data)?;
                PublicationRecord::from_publication(&uri, publication).ok_or_else(|| {
                    AppError::new(
                        ErrorCode::Parse,
                        "Failed to derive Standard.Site publication record key from URI",
                    )
                })
            })
            .collect()
    }

    pub async fn publication_get(&self, did_or_handle: &str, tid: &str) -> Result<PublicationRecord, AppError> {
        let (uri, data) = self
            .get_record(did_or_handle, tid, Publication::nsid(), "Standard.Site publication")
            .await?;
        let publication = parse_publication(&data)?;

        PublicationRecord::from_publication(&uri, publication).ok_or_else(|| {
            AppError::new(
                ErrorCode::Parse,
                "Failed to derive Standard.Site publication record key from URI",
            )
        })
    }

    pub async fn post_list(
        &self, did_or_handle: &str, publication_tid: Option<&str>,
    ) -> Result<Vec<PostRecord>, AppError> {
        let documents = self
            .list_records(did_or_handle, StandardSiteDocument::nsid(), "Standard.Site posts")
            .await?;
        let publication_tid = normalize_optional_filter(publication_tid);

        let mut posts = Vec::with_capacity(documents.len());
        for (uri, data) in documents {
            let document = parse_document(&data)?;
            if let Some(filter) = publication_tid
                && !publication_matches_filter(document.site.as_str(), filter)
            {
                continue;
            }

            let post = PostRecord::from_document(&uri, document).ok_or_else(|| {
                AppError::new(
                    ErrorCode::Parse,
                    "Failed to derive Standard.Site post record key from URI",
                )
            })?;
            posts.push(post);
        }

        Ok(posts)
    }

    pub async fn post_get(&self, did_or_handle: &str, tid: &str) -> Result<PostRecord, AppError> {
        let (uri, data) = self
            .get_record(did_or_handle, tid, StandardSiteDocument::nsid(), "Standard.Site post")
            .await?;
        let document = parse_document(&data)?;

        PostRecord::from_document(&uri, document).ok_or_else(|| {
            AppError::new(
                ErrorCode::Parse,
                "Failed to derive Standard.Site post record key from URI",
            )
        })
    }

    pub async fn post_get_markdown(&self, did_or_handle: &str, tid: &str) -> Result<String, AppError> {
        let (repo_did, document) = self.standard_site_document_get(did_or_handle, tid).await?;

        match document.content {
            Some(content) => {
                let leaflet_document = LeafletDocument::new()
                    .author(AtIdentifier::Did(repo_did))
                    .title(document.title)
                    .maybe_description(document.description)
                    .maybe_publication(site_as_at_uri(&document.site)?)
                    .maybe_published_at(Some(document.published_at))
                    .maybe_tags(document.tags)
                    .pages(content_pages_to_document_pages(content))
                    .build();

                leaflet_document_to_markdown(&leaflet_document)
            }
            None if document.text_content.is_some() => Ok(document.text_content.unwrap().to_string()),
            None => Err(AppError::new(
                ErrorCode::Parse,
                "Standard.Site post does not contain importable Leaflet content or textContent",
            )),
        }
    }

    async fn standard_site_document_get(
        &self, did_or_handle: &str, tid: &str,
    ) -> Result<(Did<'static>, StandardSiteDocument<'static>), AppError> {
        let trimmed_tid = trim_tid(tid, "Post ID is required")?;
        let (repo_did, pds_url) = self.resolve_repo_and_pds(did_or_handle).await?;
        let rkey = RecordKey::any(trimmed_tid)
            .map_err(|error| AppError::new(ErrorCode::Parse, format!("Invalid Standard.Site post ID: {}", error)))?;
        let request = GetRecord::new()
            .repo(AtIdentifier::Did(repo_did.clone()))
            .collection(StandardSiteDocument::nsid())
            .rkey(rkey)
            .build();

        let response = self
            .http
            .xrpc(pds_url)
            .send(&request)
            .await
            .map_err(|error| AppError::io(format!("Failed to fetch Standard.Site post: {}", error)))?;
        let output = response
            .into_output()
            .map_err(|error| AppError::io(format!("Failed to decode Standard.Site post: {}", error)))?;
        let record = parse_document(&output.value.into_static())?;

        Ok((repo_did, record))
    }

    async fn list_records(
        &self, did_or_handle: &str, collection: jacquard::common::types::string::Nsid<'static>, label: &str,
    ) -> Result<Vec<(String, Data<'static>)>, AppError> {
        let (repo_did, pds_url) = self.resolve_repo_and_pds(did_or_handle).await?;
        let request = ListRecords::new()
            .repo(AtIdentifier::Did(repo_did))
            .collection(collection)
            .limit(Some(100))
            .reverse(Some(true))
            .build();

        let response = self
            .http
            .xrpc(pds_url)
            .send(&request)
            .await
            .map_err(|error| AppError::io(format!("Failed to list {}: {}", label, error)))?;
        let output = response
            .into_output()
            .map_err(|error| AppError::io(format!("Failed to decode {}: {}", label, error)))?;

        Ok(output
            .records
            .into_iter()
            .map(|record| (record.uri.to_string(), record.value.into_static()))
            .collect())
    }

    async fn get_record(
        &self, did_or_handle: &str, tid: &str, collection: jacquard::common::types::string::Nsid<'static>, label: &str,
    ) -> Result<(String, Data<'static>), AppError> {
        let trimmed_tid = trim_tid(tid, &format!("{} ID is required", label))?;
        let (repo_did, pds_url) = self.resolve_repo_and_pds(did_or_handle).await?;
        let rkey = RecordKey::any(trimmed_tid)
            .map_err(|error| AppError::new(ErrorCode::Parse, format!("Invalid {} ID: {}", label, error)))?;
        let request = GetRecord::new()
            .repo(AtIdentifier::Did(repo_did))
            .collection(collection)
            .rkey(rkey)
            .build();

        let response = self
            .http
            .xrpc(pds_url)
            .send(&request)
            .await
            .map_err(|error| AppError::io(format!("Failed to fetch {}: {}", label, error)))?;
        let output = response
            .into_output()
            .map_err(|error| AppError::io(format!("Failed to decode {}: {}", label, error)))?;

        Ok((output.uri.to_string(), output.value.into_static()))
    }
}

fn parse_publication(data: &Data<'static>) -> Result<Publication<'static>, AppError> {
    from_data::<Publication<'_>>(data)
        .map(|value| value.into_static())
        .map_err(|error| AppError::io(format!("Failed to parse Standard.Site publication: {}", error)))
}

fn parse_document(data: &Data<'static>) -> Result<StandardSiteDocument<'static>, AppError> {
    from_data::<StandardSiteDocument<'_>>(data)
        .map(|value| value.into_static())
        .map_err(|error| AppError::io(format!("Failed to parse Standard.Site post: {}", error)))
}

fn cow_str_option_to_string(value: Option<CowStr<'_>>) -> String {
    value.map(|value| value.to_string()).unwrap_or_default()
}

fn record_key_from_uri(uri: &str) -> Option<String> {
    AtUri::new(uri).ok()?.rkey().map(|rkey| rkey.as_ref().to_string())
}

fn trim_tid<'a>(tid: &'a str, message: &str) -> Result<&'a str, AppError> {
    let trimmed = tid.trim();
    if trimmed.is_empty() { Err(AppError::new(ErrorCode::InvalidPath, message)) } else { Ok(trimmed) }
}

fn normalize_optional_filter(filter: Option<&str>) -> Option<&str> {
    filter.and_then(|value| {
        let trimmed = value.trim();
        if trimmed.is_empty() { None } else { Some(trimmed) }
    })
}

fn publication_matches_filter(publication_uri: &str, filter: &str) -> bool {
    publication_uri == filter || record_key_from_uri(publication_uri).as_deref() == Some(filter)
}

fn site_as_at_uri(site: &jacquard::common::types::string::Uri<'_>) -> Result<Option<AtUri<'static>>, AppError> {
    if !site.as_str().starts_with("at://") {
        return Ok(None);
    }

    AtUri::new(site.as_str())
        .map(|uri| Some(uri.into_static()))
        .map_err(|error| AppError::new(ErrorCode::Parse, format!("Invalid Standard.Site site URI: {}", error)))
}

fn content_pages_to_document_pages(content: LeafletContent<'static>) -> Vec<DocumentPagesItem<'static>> {
    content
        .pages
        .into_iter()
        .filter_map(|page| match page {
            ContentPagesItem::LinearDocument(page) => Some(DocumentPagesItem::LinearDocument(page)),
            ContentPagesItem::Canvas(page) => Some(DocumentPagesItem::Canvas(page)),
            ContentPagesItem::Unknown(_) => None,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use jacquard::api::pub_leaflet::pages::linear_document::LinearDocument;

    #[test]
    fn publication_filter_matches_tid() {
        assert!(publication_matches_filter(
            "at://did:plc:alice/site.standard.publication/3kxyz",
            "3kxyz"
        ));
    }

    #[test]
    fn content_pages_convert_to_document_pages() {
        let content = LeafletContent::new()
            .pages(vec![ContentPagesItem::LinearDocument(Box::new(
                LinearDocument::new().blocks(Vec::new()).build(),
            ))])
            .build()
            .into_static();

        let pages = content_pages_to_document_pages(content);

        assert!(matches!(pages.first(), Some(DocumentPagesItem::LinearDocument(_))));
    }
}
