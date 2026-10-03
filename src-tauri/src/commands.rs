//! Thin wrappers: resolve the vault, call `keyslate-core`, turn errors into strings.
//!
//! Every command is `async` so it runs off the main thread; that is what makes
//! the blocking dialog calls safe and keeps a slow disk from freezing the UI.

use std::fmt::Display;
use std::path::PathBuf;
use std::process::Command;

use keyslate_core::{Format, Note, NoteMeta, SearchHit, TextFile, Vault};
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::{DialogExt, FileDialogBuilder};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::{settings_file, watch, AppState, MAIN_WINDOW};

type CmdResult<T> = Result<T, String>;

fn err(e: impl Display) -> String {
    e.to_string()
}

fn vault(state: &State<'_, AppState>) -> CmdResult<Vault> {
    let path = state.lock()?.vault.clone();
    Vault::open(path).map_err(err)
}

fn path_string(path: PathBuf) -> String {
    path.to_string_lossy().into_owned()
}

/// A file dialog owned by the main window, so it cannot drop behind it.
fn file_dialog(app: &AppHandle) -> FileDialogBuilder<tauri::Wry> {
    let dialog = app.dialog().file();
    match app.get_webview_window(MAIN_WINDOW) {
        Some(window) => dialog.set_parent(&window),
        None => dialog,
    }
}

fn pick_directory(app: &AppHandle) -> CmdResult<Option<PathBuf>> {
    file_dialog(app)
        .blocking_pick_folder()
        .map(|picked| picked.into_path().map_err(err))
        .transpose()
}

#[tauri::command]
pub async fn get_vault_path(state: State<'_, AppState>) -> CmdResult<String> {
    Ok(path_string(state.lock()?.vault.clone()))
}

#[tauri::command]
pub async fn set_vault_path(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
) -> CmdResult<()> {
    let vault = Vault::open(path.trim()).map_err(err)?;
    keyslate_core::set_vault_path(&settings_file(&app)?, vault.root()).map_err(err)?;
    // A folder that cannot be watched still works as a vault; it only misses outside edits.
    let watcher = watch(&app, vault.root()).ok();
    let mut inner = state.lock()?;
    inner.vault = vault.root().to_path_buf();
    inner._watcher = watcher;
    Ok(())
}

#[tauri::command]
pub async fn pick_folder(app: AppHandle) -> CmdResult<Option<String>> {
    Ok(pick_directory(&app)?.map(path_string))
}

#[tauri::command]
pub async fn list_notes(state: State<'_, AppState>) -> CmdResult<Vec<NoteMeta>> {
    Ok(vault(&state)?.list_notes())
}

#[tauri::command]
pub async fn list_trash(state: State<'_, AppState>) -> CmdResult<Vec<NoteMeta>> {
    Ok(vault(&state)?.list_trash())
}

#[tauri::command]
pub async fn read_note(state: State<'_, AppState>, id: String) -> CmdResult<Note> {
    vault(&state)?.read_note(&id).map_err(err)
}

#[tauri::command]
pub async fn create_note(
    state: State<'_, AppState>,
    title: String,
    format: String,
    content: String,
) -> CmdResult<NoteMeta> {
    let format = Format::parse(&format).map_err(err)?;
    vault(&state)?
        .create_note(&title, format, &content)
        .map_err(err)
}

#[tauri::command]
pub async fn write_note(
    state: State<'_, AppState>,
    id: String,
    content: String,
) -> CmdResult<NoteMeta> {
    vault(&state)?.write_note(&id, &content).map_err(err)
}

#[tauri::command]
pub async fn rename_note(
    state: State<'_, AppState>,
    id: String,
    title: String,
) -> CmdResult<NoteMeta> {
    vault(&state)?.rename_note(&id, &title).map_err(err)
}

#[tauri::command]
pub async fn set_format(
    state: State<'_, AppState>,
    id: String,
    format: String,
) -> CmdResult<NoteMeta> {
    let format = Format::parse(&format).map_err(err)?;
    vault(&state)?.set_format(&id, format).map_err(err)
}

#[tauri::command]
pub async fn duplicate_note(state: State<'_, AppState>, id: String) -> CmdResult<NoteMeta> {
    vault(&state)?.duplicate_note(&id).map_err(err)
}

#[tauri::command]
pub async fn set_pinned(
    state: State<'_, AppState>,
    id: String,
    pinned: bool,
) -> CmdResult<NoteMeta> {
    vault(&state)?.set_pinned(&id, pinned).map_err(err)
}

#[tauri::command]
pub async fn set_tags(
    state: State<'_, AppState>,
    id: String,
    tags: Vec<String>,
) -> CmdResult<NoteMeta> {
    vault(&state)?.set_tags(&id, &tags).map_err(err)
}

#[tauri::command]
pub async fn trash_note(state: State<'_, AppState>, id: String) -> CmdResult<()> {
    vault(&state)?.trash_note(&id).map_err(err)
}

#[tauri::command]
pub async fn restore_note(state: State<'_, AppState>, id: String) -> CmdResult<NoteMeta> {
    vault(&state)?.restore_note(&id).map_err(err)
}

#[tauri::command]
pub async fn delete_note(state: State<'_, AppState>, id: String) -> CmdResult<()> {
    vault(&state)?.delete_note(&id).map_err(err)
}

#[tauri::command]
pub async fn empty_trash(state: State<'_, AppState>) -> CmdResult<()> {
    vault(&state)?.empty_trash().map_err(err)
}

#[tauri::command]
pub async fn search(state: State<'_, AppState>, query: String) -> CmdResult<Vec<SearchHit>> {
    Ok(vault(&state)?.search(&query))
}

#[tauri::command]
pub async fn open_text_files(app: AppHandle, extensions: Vec<String>) -> CmdResult<Vec<TextFile>> {
    let extensions: Vec<&str> = extensions
        .iter()
        .map(|e| e.trim().trim_start_matches('.'))
        .filter(|e| !e.is_empty())
        .collect();
    let mut dialog = file_dialog(&app);
    if !extensions.is_empty() {
        dialog = dialog.add_filter("Text files", &extensions);
    }
    let picked = dialog.blocking_pick_files().unwrap_or_default();
    Ok(picked
        .into_iter()
        .filter_map(|file| file.into_path().ok())
        .filter_map(|path| keyslate_core::read_text_file(&path))
        .collect())
}

#[tauri::command]
pub async fn read_text_paths(paths: Vec<String>) -> CmdResult<Vec<TextFile>> {
    let paths: Vec<PathBuf> = paths.into_iter().map(PathBuf::from).collect();
    Ok(keyslate_core::read_text_paths(&paths))
}

#[tauri::command]
pub async fn save_text_file(
    app: AppHandle,
    name: String,
    content: String,
) -> CmdResult<Option<String>> {
    let Some(picked) = file_dialog(&app).set_file_name(name).blocking_save_file() else {
        return Ok(None);
    };
    let path = picked.into_path().map_err(err)?;
    keyslate_core::write_text(&path, &content).map_err(err)?;
    Ok(Some(path_string(path)))
}

#[tauri::command]
pub async fn export_vault(app: AppHandle, state: State<'_, AppState>) -> CmdResult<Option<String>> {
    let Some(dest) = pick_directory(&app)? else {
        return Ok(None);
    };
    vault(&state)?.export(&dest).map_err(err)?;
    Ok(Some(path_string(dest)))
}

#[tauri::command]
pub async fn reveal_vault(state: State<'_, AppState>) -> CmdResult<()> {
    let vault = vault(&state)?;
    // The path is a separate argv entry, never part of a shell string. Explorer
    // exits non-zero even on success, so only a failure to launch is an error.
    Command::new("explorer.exe")
        .arg(vault.root())
        .status()
        .map(|_| ())
        .map_err(err)
}

#[tauri::command]
pub async fn load_settings(app: AppHandle) -> CmdResult<Value> {
    keyslate_core::load_settings(&settings_file(&app)?).map_err(err)
}

#[tauri::command]
pub async fn save_settings(app: AppHandle, settings: Value) -> CmdResult<()> {
    keyslate_core::save_settings(&settings_file(&app)?, settings).map_err(err)
}

#[tauri::command]
pub async fn set_global_shortcut(app: AppHandle, accelerator: Option<String>) -> CmdResult<()> {
    let shortcuts = app.global_shortcut();
    shortcuts.unregister_all().map_err(err)?;
    let Some(accelerator) = accelerator.filter(|a| !a.trim().is_empty()) else {
        return Ok(());
    };
    shortcuts
        .on_shortcut(accelerator.trim(), |app, _shortcut, event| {
            if event.state != ShortcutState::Pressed {
                return;
            }
            if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
            let _ = app.emit_to(MAIN_WINDOW, "quick-capture", ());
        })
        .map_err(|e| format!("Could not register the shortcut \"{accelerator}\": {e}"))
}
