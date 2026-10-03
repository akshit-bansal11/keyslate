// Without this a console window opens next to the app in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};
use std::time::Duration;

use keyslate_core::Vault;
use notify_debouncer_mini::notify::{self, RecommendedWatcher, RecursiveMode};
use notify_debouncer_mini::{new_debouncer, DebounceEventResult, Debouncer};
use tauri::{AppHandle, Emitter, Manager};

pub const MAIN_WINDOW: &str = "main";

pub struct Inner {
    pub vault: PathBuf,
    /// Dropping the debouncer stops the watch, so replacing it is the restart.
    pub _watcher: Option<Debouncer<RecommendedWatcher>>,
}

pub struct AppState(Mutex<Inner>);

impl AppState {
    pub fn lock(&self) -> Result<MutexGuard<'_, Inner>, String> {
        self.0.lock().map_err(|e| e.to_string())
    }
}

pub fn settings_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("settings.json"))
}

/// Emits `vault-changed` when notes or the index change on disk.
///
/// Recursive so `.keyslate/index.json` is covered even when `.keyslate` is
/// created after the watch starts; `is_vault_change` drops everything else.
pub fn watch(app: &AppHandle, vault: &Path) -> notify::Result<Debouncer<RecommendedWatcher>> {
    let handle = app.clone();
    let root = vault.to_path_buf();
    let mut debouncer = new_debouncer(
        Duration::from_millis(300),
        move |result: DebounceEventResult| {
            let Ok(events) = result else { return };
            if events
                .iter()
                .any(|event| keyslate_core::is_vault_change(&root, &event.path))
            {
                let _ = handle.emit_to(MAIN_WINDOW, "vault-changed", ());
            }
        },
    )?;
    debouncer.watcher().watch(vault, RecursiveMode::Recursive)?;
    Ok(debouncer)
}

fn initial_vault(app: &AppHandle) -> Result<PathBuf, String> {
    let settings = settings_file(app)
        .and_then(|file| keyslate_core::load_settings(&file).map_err(|e| e.to_string()))
        .unwrap_or_default();
    if let Some(path) = keyslate_core::vault_path(&settings) {
        return Ok(path);
    }
    let documents = app
        .path()
        .document_dir()
        .or_else(|_| app.path().home_dir())
        .map_err(|e| e.to_string())?;
    Ok(documents.join("Keyslate"))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();
            let vault = initial_vault(&handle)?;
            // A vault that cannot be opened or watched (an unplugged drive) must
            // not stop the app starting: commands report it and the user can
            // pick another folder.
            let watcher = Vault::open(&vault)
                .ok()
                .and_then(|_| watch(&handle, &vault).ok());
            app.manage(AppState(Mutex::new(Inner {
                vault,
                _watcher: watcher,
            })));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_vault_path,
            commands::set_vault_path,
            commands::pick_folder,
            commands::list_notes,
            commands::list_trash,
            commands::read_note,
            commands::create_note,
            commands::write_note,
            commands::rename_note,
            commands::set_format,
            commands::duplicate_note,
            commands::set_pinned,
            commands::set_tags,
            commands::trash_note,
            commands::restore_note,
            commands::delete_note,
            commands::empty_trash,
            commands::search,
            commands::open_text_files,
            commands::read_text_paths,
            commands::save_text_file,
            commands::export_vault,
            commands::reveal_vault,
            commands::load_settings,
            commands::save_settings,
            commands::set_global_shortcut,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Keyslate");
}
