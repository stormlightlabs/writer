use jacquard::api::com_atproto::repo::get_record::GetRecord;
use jacquard::api::com_atproto::repo::list_records::ListRecords;
use jacquard::api::sh_tangled::string::TangledString;
use jacquard::common::types::collection::Collection;
use jacquard::common::types::recordkey::RecordKey;
use jacquard::common::types::value::from_data;
use jacquard::common::xrpc::XrpcExt;
use serde::Serialize;

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
}
