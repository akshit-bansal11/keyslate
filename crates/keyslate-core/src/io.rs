use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::de::DeserializeOwned;

use crate::{Result, TextFile};

/// Files larger than this are skipped by search and by the text-file readers.
pub const MAX_TEXT_BYTES: u64 = 5 * 1024 * 1024;

const IMPORTABLE: [&str; 4] = ["md", "markdown", "txt", "json"];

pub(crate) fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or_default()
}

/// Writes through a sibling temp file and renames it over the target, so a
/// crash mid-write leaves either the old file or the new one, never a torn one.
pub(crate) fn write_atomic(path: &Path, bytes: &[u8]) -> io::Result<()> {
    static SEQ: AtomicU64 = AtomicU64::new(0);
    let name = path
        .file_name()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "path has no file name"))?;
    // The `.tmp` suffix keeps the temp file from ever being listed as a note.
    let tmp = path.with_file_name(format!(
        ".{}.{}-{}.tmp",
        name.to_string_lossy(),
        std::process::id(),
        SEQ.fetch_add(1, Ordering::Relaxed)
    ));
    let written = (|| {
        let mut file = File::create(&tmp)?;
        file.write_all(bytes)?;
        file.sync_all()?;
        drop(file);
        fs::rename(&tmp, path)
    })();
    if written.is_err() {
        let _ = fs::remove_file(&tmp);
    }
    written
}

/// Lossy UTF-8 with a leading BOM removed; everything else is kept as-is.
pub(crate) fn decode(bytes: &[u8]) -> String {
    let text = String::from_utf8_lossy(bytes);
    text.strip_prefix('\u{feff}').unwrap_or(&text).to_string()
}

/// Reads a JSON file. Missing yields `None`. A file that does not parse is
/// renamed aside rather than overwritten, so nothing a user wrote is destroyed.
pub(crate) fn read_json<T: DeserializeOwned>(path: &Path) -> io::Result<Option<T>> {
    let bytes = match fs::read(path) {
        Ok(bytes) => bytes,
        Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(e),
    };
    match serde_json::from_slice(&bytes) {
        Ok(value) => Ok(Some(value)),
        Err(_) => {
            let mut aside = path.as_os_str().to_owned();
            aside.push(format!(".corrupt-{}", now_ms()));
            fs::rename(path, PathBuf::from(aside))?;
            Ok(None)
        }
    }
}

pub(crate) fn write_json<T: serde::Serialize>(path: &Path, value: &T) -> Result<()> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir)?;
    }
    write_atomic(path, &serde_json::to_vec_pretty(value)?)?;
    Ok(())
}

/// `None` for anything that is not a regular file of at most [`MAX_TEXT_BYTES`].
pub fn read_text_file(path: &Path) -> Option<TextFile> {
    let meta = fs::metadata(path).ok()?;
    if !meta.is_file() || meta.len() > MAX_TEXT_BYTES {
        return None;
    }
    Some(TextFile {
        name: path.file_name()?.to_string_lossy().into_owned(),
        content: decode(&fs::read(path).ok()?),
    })
}

/// Reads dropped paths, silently skipping directories and other file types.
pub fn read_text_paths(paths: &[PathBuf]) -> Vec<TextFile> {
    paths
        .iter()
        .filter(|p| {
            p.extension()
                .and_then(|e| e.to_str())
                .is_some_and(|e| IMPORTABLE.contains(&e.to_ascii_lowercase().as_str()))
        })
        .filter_map(|p| read_text_file(p))
        .collect()
}

pub fn write_text(path: &Path, content: &str) -> Result<()> {
    write_atomic(path, content.as_bytes())?;
    Ok(())
}
