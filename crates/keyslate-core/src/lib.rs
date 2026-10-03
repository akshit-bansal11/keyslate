//! Vault, search and settings logic for Keyslate.
//!
//! Everything here takes paths as parameters and knows nothing about Tauri, so
//! the whole data layer is testable without a window.

mod io;
mod settings;
mod vault;

use std::fmt;

use serde::Serialize;

pub use io::{read_text_file, read_text_paths, write_text, MAX_TEXT_BYTES};
pub use settings::{load_settings, save_settings, set_vault_path, vault_path};
pub use vault::{is_vault_change, normalize_tags, sanitize_title, validate_id, Vault};

/// A failure with a message fit to show the user as-is.
#[derive(Debug)]
pub struct Error(pub String);

pub type Result<T> = std::result::Result<T, Error>;

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for Error {}

impl From<std::io::Error> for Error {
    fn from(e: std::io::Error) -> Self {
        Self(e.to_string())
    }
}

impl From<serde_json::Error> for Error {
    fn from(e: serde_json::Error) -> Self {
        Self(e.to_string())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Format {
    Md,
    Txt,
}

impl Format {
    pub fn parse(s: &str) -> Result<Self> {
        match s {
            "md" => Ok(Self::Md),
            "txt" => Ok(Self::Txt),
            _ => Err(Error(format!("Unsupported note format \"{s}\""))),
        }
    }

    pub fn ext(self) -> &'static str {
        match self {
            Self::Md => "md",
            Self::Txt => "txt",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteMeta {
    pub id: String,
    pub title: String,
    pub format: Format,
    pub pinned: bool,
    pub tags: Vec<String>,
    pub modified: u64,
    pub size: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    #[serde(flatten)]
    pub meta: NoteMeta,
    pub content: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    pub id: String,
    pub title: String,
    pub line: u32,
    pub snippet: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TextFile {
    pub name: String,
    pub content: String,
}
