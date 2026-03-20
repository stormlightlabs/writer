use jacquard::api::com_atproto::repo::{
    create_record::CreateRecord, delete_record::DeleteRecord, get_record::GetRecord, list_records::ListRecords,
    put_record::PutRecord,
};
use jacquard::api::sh_tangled::string::TangledString;
use jacquard::common::types::value::{from_data, to_data};
use jacquard::common::types::{collection::Collection, ident::AtIdentifier, recordkey::RecordKey, string::Datetime};
use jacquard::types::did::Did;
use jacquard::xrpc::{XrpcClient, XrpcExt};
use serde::Serialize;
use unicode_segmentation::UnicodeSegmentation;

const MAX_RECORD_BYTES: usize = 2 * 1024 * 1024;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StringRecord {
    pub uri: String,
    pub tid: String,
    pub filename: String,
    pub description: String,
    pub contents: String,
    pub created_at: String,
}

impl StringRecord {
    pub fn from_tangled_string(uri: &str, value: TangledString<'_>) -> Option<Self> {
        let tid = jacquard::common::types::string::AtUri::new(uri)
            .ok()?
            .rkey()
            .map(|rkey| rkey.as_ref().to_string())?;

        Some(Self {
            uri: uri.to_string(),
            tid,
            filename: value.filename.to_string(),
            description: value.description.to_string(),
            contents: value.contents.to_string(),
            created_at: value.created_at.to_string(),
        })
    }
}

impl super::auth::AtProtoState {
    pub async fn string_list(&self, did_or_handle: &str) -> Result<Vec<StringRecord>, writer_core::AppError> {
        let (repo_did, pds_url) = self.resolve_repo_and_pds(did_or_handle).await?;
        let request = ListRecords::new()
            .repo(jacquard::common::types::ident::AtIdentifier::Did(repo_did))
            .collection(TangledString::nsid())
            .limit(Some(100))
            .reverse(Some(true))
            .build();

        let response = self
            .http
            .xrpc(pds_url)
            .send(&request)
            .await
            .map_err(|error| writer_core::AppError::io(format!("Failed to list Tangled strings: {}", error)))?;
        let output = response
            .into_output()
            .map_err(|error| writer_core::AppError::io(format!("Failed to decode Tangled strings: {}", error)))?;

        let mut records = Vec::with_capacity(output.records.len());
        for record in output.records {
            let value = from_data::<TangledString<'_>>(&record.value)
                .map_err(|error| writer_core::AppError::io(format!("Failed to parse Tangled string: {}", error)))?;
            let Some(mapped) = StringRecord::from_tangled_string(record.uri.as_ref(), value) else {
                return Err(writer_core::AppError::new(
                    writer_core::ErrorCode::Parse,
                    "Failed to derive Tangled string record key from URI",
                ));
            };
            records.push(mapped);
        }

        Ok(records)
    }

    pub async fn string_get(&self, did_or_handle: &str, tid: &str) -> Result<StringRecord, writer_core::AppError> {
        let trimmed_tid = tid.trim();
        if trimmed_tid.is_empty() {
            return Err(writer_core::AppError::new(
                writer_core::ErrorCode::InvalidPath,
                "String ID is required",
            ));
        }

        let (repo_did, pds_url) = self.resolve_repo_and_pds(did_or_handle).await?;
        let rkey = RecordKey::any(trimmed_tid).map_err(|error| {
            writer_core::AppError::new(
                writer_core::ErrorCode::Parse,
                format!("Invalid Tangled string ID: {}", error),
            )
        })?;
        let request = GetRecord::new()
            .repo(jacquard::common::types::ident::AtIdentifier::Did(repo_did))
            .collection(TangledString::nsid())
            .rkey(rkey)
            .build();

        let response = self
            .http
            .xrpc(pds_url)
            .send(&request)
            .await
            .map_err(|error| writer_core::AppError::io(format!("Failed to fetch Tangled string: {}", error)))?;
        let output = response
            .into_output()
            .map_err(|error| writer_core::AppError::io(format!("Failed to decode Tangled string: {}", error)))?;
        let value = from_data::<TangledString<'_>>(&output.value)
            .map_err(|error| writer_core::AppError::io(format!("Failed to parse Tangled string: {}", error)))?;

        StringRecord::from_tangled_string(output.uri.as_ref(), value).ok_or_else(|| {
            writer_core::AppError::new(
                writer_core::ErrorCode::Parse,
                "Failed to derive Tangled string record key from URI",
            )
        })
    }

    pub async fn string_create(
        &self, filename: &str, description: &str, contents: &str,
    ) -> Result<StringRecord, writer_core::AppError> {
        validate_filename(filename)?;
        validate_description(description)?;
        validate_contents(contents)?;

        let ts = build_tangled_string(filename, description, contents, Datetime::now())?;
        let session = self.require_session()?;
        let did_str = self.session_did()?;
        let did = Did::new(&did_str).map_err(|error| {
            writer_core::AppError::new(writer_core::ErrorCode::Parse, format!("Invalid session DID: {}", error))
        })?;

        let data = to_data(&ts)
            .map_err(|error| writer_core::AppError::io(format!("Failed to serialize Tangled string: {}", error)))?;

        let request = CreateRecord::new()
            .repo(AtIdentifier::Did(did))
            .collection(TangledString::nsid())
            .record(data)
            .build();

        let response = session
            .send(request)
            .await
            .map_err(|error| writer_core::AppError::io(format!("Failed to create Tangled string: {}", error)))?;
        let output = response
            .into_output()
            .map_err(|error| writer_core::AppError::io(format!("Failed to decode create response: {}", error)))?;

        StringRecord::from_tangled_string(output.uri.as_ref(), ts).ok_or_else(|| {
            writer_core::AppError::new(
                writer_core::ErrorCode::Parse,
                "Failed to derive Tangled string record key from created URI",
            )
        })
    }

    pub async fn string_update(
        &self, tid: &str, filename: &str, description: &str, contents: &str,
    ) -> Result<StringRecord, writer_core::AppError> {
        let trimmed_tid = tid.trim();
        if trimmed_tid.is_empty() {
            return Err(writer_core::AppError::new(
                writer_core::ErrorCode::InvalidPath,
                "String ID is required for update",
            ));
        }

        validate_filename(filename)?;
        validate_description(description)?;
        validate_contents(contents)?;

        let ts = build_tangled_string(filename, description, contents, Datetime::now())?;
        let session = self.require_session()?;
        let did_str = self.session_did()?;
        let did = Did::new(&did_str).map_err(|error| {
            writer_core::AppError::new(writer_core::ErrorCode::Parse, format!("Invalid session DID: {}", error))
        })?;
        let rkey = RecordKey::any(trimmed_tid).map_err(|error| {
            writer_core::AppError::new(
                writer_core::ErrorCode::Parse,
                format!("Invalid Tangled string ID: {}", error),
            )
        })?;

        let data = to_data(&ts)
            .map_err(|error| writer_core::AppError::io(format!("Failed to serialize Tangled string: {}", error)))?;

        let request = PutRecord::new()
            .repo(AtIdentifier::Did(did))
            .collection(TangledString::nsid())
            .rkey(rkey)
            .record(data)
            .build();

        let response = session
            .send(request)
            .await
            .map_err(|error| writer_core::AppError::io(format!("Failed to update Tangled string: {}", error)))?;
        let output = response
            .into_output()
            .map_err(|error| writer_core::AppError::io(format!("Failed to decode update response: {}", error)))?;

        StringRecord::from_tangled_string(output.uri.as_ref(), ts).ok_or_else(|| {
            writer_core::AppError::new(
                writer_core::ErrorCode::Parse,
                "Failed to derive Tangled string record key from updated URI",
            )
        })
    }

    pub async fn string_delete(&self, tid: &str) -> Result<(), writer_core::AppError> {
        let trimmed_tid = tid.trim();
        if trimmed_tid.is_empty() {
            return Err(writer_core::AppError::new(
                writer_core::ErrorCode::InvalidPath,
                "String ID is required for delete",
            ));
        }

        let session = self.require_session()?;
        let did_str = self.session_did()?;
        let did = Did::new(&did_str).map_err(|error| {
            writer_core::AppError::new(writer_core::ErrorCode::Parse, format!("Invalid session DID: {}", error))
        })?;
        let rkey = RecordKey::any(trimmed_tid).map_err(|error| {
            writer_core::AppError::new(
                writer_core::ErrorCode::Parse,
                format!("Invalid Tangled string ID: {}", error),
            )
        })?;

        let request = DeleteRecord::new()
            .repo(AtIdentifier::Did(did))
            .collection(TangledString::nsid())
            .rkey(rkey)
            .build();

        session
            .send(request)
            .await
            .map_err(|error| writer_core::AppError::io(format!("Failed to delete Tangled string: {}", error)))?
            .into_output()
            .map_err(|error| writer_core::AppError::io(format!("Failed to decode delete response: {}", error)))?;

        Ok(())
    }
}

fn validate_filename(filename: &str) -> Result<(), writer_core::AppError> {
    let graphemes = filename.graphemes(true).count();
    if graphemes < 1 {
        return Err(writer_core::AppError::new(
            writer_core::ErrorCode::Parse,
            "Filename is required",
        ));
    }
    if graphemes > 140 {
        return Err(writer_core::AppError::new(
            writer_core::ErrorCode::Parse,
            format!("Filename must be at most 140 graphemes (got {})", graphemes),
        ));
    }
    Ok(())
}

fn validate_description(description: &str) -> Result<(), writer_core::AppError> {
    let graphemes = description.graphemes(true).count();
    if graphemes > 280 {
        return Err(writer_core::AppError::new(
            writer_core::ErrorCode::Parse,
            format!("Description must be at most 280 graphemes (got {})", graphemes),
        ));
    }
    Ok(())
}

fn validate_contents(contents: &str) -> Result<(), writer_core::AppError> {
    if contents.graphemes(true).next().is_none() {
        return Err(writer_core::AppError::new(
            writer_core::ErrorCode::Parse,
            "Contents must not be empty",
        ));
    }
    Ok(())
}

/// Builds and validates record size before returning. Returns an error if the serialized
/// JSON representation exceeds the 2 MiB PDS limit.
fn build_tangled_string<'a>(
    filename: &'a str, description: &'a str, contents: &'a str, created_at: Datetime,
) -> Result<TangledString<'a>, writer_core::AppError> {
    let ts = TangledString::new()
        .filename(filename)
        .description(description)
        .contents(contents)
        .created_at(created_at)
        .build();

    let serialized = serde_json::to_vec(&ts)
        .map_err(|error| writer_core::AppError::io(format!("Failed to serialize Tangled string: {}", error)))?;
    if serialized.len() > MAX_RECORD_BYTES {
        return Err(writer_core::AppError::new(
            writer_core::ErrorCode::Parse,
            format!(
                "Record is too large ({} bytes); PDS limit is {} bytes (2 MiB)",
                serialized.len(),
                MAX_RECORD_BYTES
            ),
        ));
    }

    Ok(ts)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_filename_rejects_empty() {
        assert!(validate_filename("").is_err());
    }

    #[test]
    fn validate_filename_rejects_over_140_graphemes() {
        assert!(validate_filename(&"a".repeat(141)).is_err());
    }

    #[test]
    fn validate_filename_accepts_140_graphemes() {
        assert!(validate_filename(&"a".repeat(140)).is_ok());
    }

    #[test]
    fn validate_filename_accepts_multibyte_unicode() {
        let name = "é".repeat(140);
        assert!(validate_filename(&name).is_ok());
        let too_long = "é".repeat(141);
        assert!(validate_filename(&too_long).is_err());
    }

    #[test]
    fn validate_description_accepts_empty() {
        assert!(validate_description("").is_ok());
    }

    #[test]
    fn validate_description_rejects_over_280_graphemes() {
        assert!(validate_description(&"a".repeat(281)).is_err());
    }

    #[test]
    fn validate_description_accepts_280_graphemes() {
        assert!(validate_description(&"a".repeat(280)).is_ok());
    }

    #[test]
    fn validate_contents_rejects_empty() {
        assert!(validate_contents("").is_err());
    }

    #[test]
    fn validate_contents_accepts_single_character() {
        assert!(validate_contents("x").is_ok());
    }

    #[test]
    fn build_tangled_string_rejects_oversized_contents() {
        let big = "x".repeat(MAX_RECORD_BYTES + 1);
        assert!(build_tangled_string("file.md", "", &big, Datetime::now()).is_err());
    }

    #[test]
    fn build_tangled_string_accepts_normal_contents() {
        assert!(build_tangled_string("notes.md", "My notes", "# Hello", Datetime::now()).is_ok());
    }
}
