use std::path::{Path, PathBuf};

use serde_json::{Map, Value};

use crate::io::{read_json, write_json};
use crate::Result;

const VAULT_PATH: &str = "vaultPath";

/// `Null` when the file is missing or was corrupt (and has been renamed aside).
pub fn load_settings(path: &Path) -> Result<Value> {
    Ok(read_json(path)?.unwrap_or(Value::Null))
}

/// Saves the UI's settings blob. `vaultPath` belongs to [`set_vault_path`]: the
/// value on disk is carried over, so a UI that saves a blob without it (or with
/// a stale one) cannot silently point the app back at the default vault.
pub fn save_settings(path: &Path, mut settings: Value) -> Result<()> {
    let current = load_settings(path)?;
    if let (Some(next), Some(vault)) = (settings.as_object_mut(), current.get(VAULT_PATH)) {
        next.insert(VAULT_PATH.into(), vault.clone());
    }
    write_json(path, &settings)
}

pub fn vault_path(settings: &Value) -> Option<PathBuf> {
    settings
        .get(VAULT_PATH)?
        .as_str()
        .filter(|s| !s.trim().is_empty())
        .map(PathBuf::from)
}

/// Merges `vaultPath` into the settings file, keeping every other key.
pub fn set_vault_path(path: &Path, vault: &Path) -> Result<()> {
    let mut settings = match load_settings(path)? {
        Value::Object(map) => map,
        _ => Map::new(),
    };
    settings.insert(
        VAULT_PATH.into(),
        Value::String(vault.to_string_lossy().into_owned()),
    );
    write_json(path, &Value::Object(settings))
}
