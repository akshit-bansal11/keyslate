use std::collections::{BTreeMap, BTreeSet, HashSet};
use std::ffi::OsStr;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::time::UNIX_EPOCH;

use serde::{Deserialize, Serialize};

use crate::io::{decode, read_json, write_atomic, write_json, MAX_TEXT_BYTES};
use crate::{Error, Format, Note, NoteMeta, Result, SearchHit};

const META_DIR: &str = ".keyslate";
const INDEX_FILE: &str = "index.json";
const MAX_TITLE_CHARS: usize = 120;
const MAX_TAG_CHARS: usize = 32;
const MAX_TAGS: usize = 20;
const MAX_HITS_PER_NOTE: usize = 5;
const MAX_HITS: usize = 200;
const MAX_SNIPPET_CHARS: usize = 160;

const WELCOME: &str = "# Welcome to Keyslate\n\n\
Every note is a plain `.md` or `.txt` file in this folder. Nothing leaves your device.\n\n\
- Edit these files with any other program; Keyslate picks the changes up.\n\
- Deleted notes go to the trash and can be restored.\n";

#[derive(Serialize, Deserialize, Default, Clone)]
struct Entry {
    #[serde(default)]
    pinned: bool,
    #[serde(default)]
    tags: Vec<String>,
}

#[derive(Serialize, Deserialize)]
struct Index {
    version: u32,
    #[serde(default)]
    notes: BTreeMap<String, Entry>,
}

impl Default for Index {
    fn default() -> Self {
        Self {
            version: 1,
            notes: BTreeMap::new(),
        }
    }
}

/// Checks an id coming from the UI: one path component, a note extension, and
/// nothing that could address a file outside the folder it is joined to.
pub fn validate_id(id: &str) -> Result<Format> {
    let bad = || Error(format!("Invalid note id \"{id}\""));
    if id.is_empty()
        || id
            .chars()
            .any(|c| matches!(c, '/' | '\\' | ':') || c.is_control())
    {
        return Err(bad());
    }
    let mut parts = Path::new(id).components();
    match (parts.next(), parts.next()) {
        (Some(Component::Normal(only)), None) if only == OsStr::new(id) => {}
        _ => return Err(bad()),
    }
    let (stem, ext) = id.rsplit_once('.').ok_or_else(bad)?;
    if stem.is_empty() || is_reserved(stem) {
        return Err(bad());
    }
    Format::parse(&ext.to_ascii_lowercase()).map_err(|_| bad())
}

/// Windows resolves these to devices whatever the extension, so `NUL.md` is not a file.
fn is_reserved(stem: &str) -> bool {
    let base = stem
        .split('.')
        .next()
        .unwrap_or_default()
        .trim_end()
        .to_ascii_uppercase();
    matches!(base.as_str(), "CON" | "PRN" | "AUX" | "NUL")
        || (base.len() == 4
            && (base.starts_with("COM") || base.starts_with("LPT"))
            && matches!(base.as_bytes()[3], b'1'..=b'9'))
}

/// Turns arbitrary user text into a title that is a legal Windows file stem.
pub fn sanitize_title(raw: &str) -> String {
    let cleaned: String = raw
        .chars()
        .map(|c| {
            if c.is_control() || "<>:\"/\\|?*".contains(c) {
                ' '
            } else {
                c
            }
        })
        .collect();
    let mut title = cleaned.split_whitespace().collect::<Vec<_>>().join(" ");
    if is_reserved(&title) {
        title.insert(0, '_');
    }
    let capped: String = title.chars().take(MAX_TITLE_CHARS).collect();
    let trimmed = capped.trim_end_matches(['.', ' ']);
    if trimmed.is_empty() {
        "Untitled".into()
    } else {
        trimmed.into()
    }
}

pub fn normalize_tags(tags: &[String]) -> Vec<String> {
    tags.iter()
        .map(|t| {
            let tag = t.trim().trim_start_matches('#').trim().to_lowercase();
            let capped: String = tag.chars().take(MAX_TAG_CHARS).collect();
            capped.trim_end().to_string()
        })
        .filter(|t| !t.is_empty())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .take(MAX_TAGS)
        .collect()
}

/// Splits a validated id into stem and extension.
fn split(id: &str) -> (&str, &str) {
    id.rsplit_once('.').unwrap_or((id, ""))
}

fn first_free(stem: &str, is_taken: impl Fn(&str) -> bool) -> String {
    if !is_taken(stem) {
        return stem.to_string();
    }
    let mut n = 2u32;
    loop {
        let candidate = format!("{stem} {n}");
        if !is_taken(&candidate) {
            return candidate;
        }
        n += 1;
    }
}

fn not_found(id: &str) -> Error {
    Error(format!("Note \"{id}\" was not found"))
}

/// A folder of note files plus the index that holds their pinned/tags state.
/// The vault root and the trash are both one of these.
struct Area {
    dir: PathBuf,
    index: PathBuf,
}

impl Area {
    fn ids(&self) -> Vec<String> {
        let Ok(entries) = fs::read_dir(&self.dir) else {
            return Vec::new();
        };
        entries
            .flatten()
            .filter(|e| e.file_type().is_ok_and(|t| t.is_file()))
            .filter_map(|e| e.file_name().into_string().ok())
            .filter(|name| validate_id(name).is_ok())
            .collect()
    }

    fn path(&self, id: &str) -> Result<PathBuf> {
        validate_id(id)?;
        let path = self.dir.join(id);
        if path.parent() != Some(self.dir.as_path()) {
            return Err(Error(format!("Invalid note id \"{id}\"")));
        }
        if !path.is_file() {
            return Err(not_found(id));
        }
        Ok(path)
    }

    fn load(&self) -> Result<Index> {
        Ok(read_json(&self.index)?.unwrap_or_default())
    }

    /// Drops entries whose file is gone, then writes.
    fn save(&self, mut index: Index) -> Result<()> {
        index
            .notes
            .retain(|id, _| validate_id(id).is_ok() && self.dir.join(id).is_file());
        write_json(&self.index, &index)
    }

    fn meta(&self, id: &str, index: &Index) -> Result<NoteMeta> {
        let format = validate_id(id)?;
        let stat = fs::metadata(self.dir.join(id)).map_err(|_| not_found(id))?;
        let entry = index.notes.get(id).cloned().unwrap_or_default();
        let modified = stat
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)
            .unwrap_or_default();
        Ok(NoteMeta {
            id: id.to_string(),
            title: split(id).0.to_string(),
            format,
            pinned: entry.pinned,
            tags: entry.tags,
            modified,
            size: stat.len(),
        })
    }

    fn list(&self) -> Vec<NoteMeta> {
        // An unreadable index must not hide the notes themselves.
        let index = self.load().unwrap_or_default();
        self.ids()
            .iter()
            .filter_map(|id| self.meta(id, &index).ok())
            .collect()
    }

    /// A title no note here uses, compared case-insensitively across both
    /// extensions because that is how Windows compares the file names.
    fn unique_title(&self, title: &str) -> String {
        let taken: HashSet<String> = self
            .ids()
            .iter()
            .map(|id| split(id).0.to_lowercase())
            .collect();
        first_free(title, |t| taken.contains(&t.to_lowercase()))
    }

    fn update_entry(&self, id: &str, change: impl FnOnce(&mut Entry)) -> Result<NoteMeta> {
        self.path(id)?;
        let mut index = self.load()?;
        let mut entry = index.notes.remove(id).unwrap_or_default();
        change(&mut entry);
        if entry.pinned || !entry.tags.is_empty() {
            index.notes.insert(id.to_string(), entry);
        }
        let meta = self.meta(id, &index)?;
        self.save(index)?;
        Ok(meta)
    }
}

/// Moves a note file and its index entry between areas, deduping the name.
fn transfer(from: &Area, to: &Area, id: &str) -> Result<String> {
    let source = from.path(id)?;
    fs::create_dir_all(&to.dir)?;
    let (stem, ext) = split(id);
    let new_id = format!("{}.{}", to.unique_title(stem), ext.to_ascii_lowercase());
    fs::rename(source, to.dir.join(&new_id))?;
    let mut from_index = from.load()?;
    let mut to_index = to.load()?;
    to_index.notes.remove(&new_id);
    if let Some(entry) = from_index.notes.remove(id) {
        to_index.notes.insert(new_id.clone(), entry);
    }
    // Destination first: if the second write fails the entry exists twice, not zero times.
    to.save(to_index)?;
    from.save(from_index)?;
    Ok(new_id)
}

pub struct Vault {
    root: PathBuf,
}

impl Vault {
    /// Opens the vault, creating the folder if needed. A folder created here
    /// gets a welcome note; an existing one is never written to.
    pub fn open(root: impl Into<PathBuf>) -> Result<Self> {
        let root = root.into();
        if !root.is_absolute() {
            return Err(Error("The vault path must be absolute".into()));
        }
        let fresh = !root.exists();
        fs::create_dir_all(&root).map_err(|e| {
            Error(format!(
                "Cannot use \"{}\" as the vault: {e}",
                root.display()
            ))
        })?;
        if fresh {
            write_atomic(&root.join("Welcome.md"), WELCOME.as_bytes())?;
        }
        Ok(Self { root })
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    fn active(&self) -> Area {
        Area {
            dir: self.root.clone(),
            index: self.root.join(META_DIR).join(INDEX_FILE),
        }
    }

    fn trash(&self) -> Area {
        let dir = self.root.join(META_DIR).join("trash");
        Area {
            index: dir.join(INDEX_FILE),
            dir,
        }
    }

    pub fn list_notes(&self) -> Vec<NoteMeta> {
        self.active().list()
    }

    pub fn list_trash(&self) -> Vec<NoteMeta> {
        self.trash().list()
    }

    pub fn read_note(&self, id: &str) -> Result<Note> {
        let area = self.active();
        let content = decode(&fs::read(area.path(id)?)?);
        let meta = area.meta(id, &area.load().unwrap_or_default())?;
        Ok(Note { meta, content })
    }

    pub fn create_note(&self, title: &str, format: Format, content: &str) -> Result<NoteMeta> {
        self.create(title, format, content.as_bytes(), Vec::new())
    }

    fn create(
        &self,
        title: &str,
        format: Format,
        bytes: &[u8],
        tags: Vec<String>,
    ) -> Result<NoteMeta> {
        let area = self.active();
        let title = area.unique_title(&sanitize_title(title));
        let id = format!("{title}.{}", format.ext());
        write_atomic(&area.dir.join(&id), bytes)?;
        let mut index = area.load()?;
        // A leftover entry from a file deleted outside the app must not pin the new note.
        let stale = index.notes.remove(&id).is_some();
        if !tags.is_empty() {
            index.notes.insert(
                id.clone(),
                Entry {
                    pinned: false,
                    tags,
                },
            );
        }
        let meta = area.meta(&id, &index)?;
        if stale || !meta.tags.is_empty() {
            area.save(index)?;
        }
        Ok(meta)
    }

    /// Fails if the note is gone rather than recreating it, so a late autosave
    /// cannot resurrect a note that was just trashed.
    pub fn write_note(&self, id: &str, content: &str) -> Result<NoteMeta> {
        let area = self.active();
        write_atomic(&area.path(id)?, content.as_bytes())?;
        area.meta(id, &area.load().unwrap_or_default())
    }

    pub fn rename_note(&self, id: &str, title: &str) -> Result<NoteMeta> {
        let format = validate_id(id)?;
        self.relocate(id, &sanitize_title(title), format)
    }

    pub fn set_format(&self, id: &str, format: Format) -> Result<NoteMeta> {
        validate_id(id)?;
        self.relocate(id, split(id).0, format)
    }

    fn relocate(&self, id: &str, title: &str, format: Format) -> Result<NoteMeta> {
        let area = self.active();
        let source = area.path(id)?;
        let new_id = format!("{title}.{}", format.ext());
        let mut index = area.load()?;
        if new_id == id {
            return area.meta(id, &index);
        }
        let wanted = title.to_lowercase();
        if area
            .ids()
            .iter()
            .any(|other| other != id && split(other).0.to_lowercase() == wanted)
        {
            return Err(Error(format!("A note named \"{title}\" already exists")));
        }
        // A case-only rename lands here too: the only name that matches is the note itself.
        fs::rename(source, area.dir.join(&new_id))?;
        let entry = index.notes.remove(id);
        let changed = entry.is_some() | index.notes.remove(&new_id).is_some();
        if let Some(entry) = entry {
            index.notes.insert(new_id.clone(), entry);
        }
        let meta = area.meta(&new_id, &index)?;
        if changed {
            area.save(index)?;
        }
        Ok(meta)
    }

    pub fn duplicate_note(&self, id: &str) -> Result<NoteMeta> {
        let area = self.active();
        let format = validate_id(id)?;
        let bytes = fs::read(area.path(id)?)?;
        let tags = area
            .load()?
            .notes
            .get(id)
            .map(|e| e.tags.clone())
            .unwrap_or_default();
        self.create(&format!("{} copy", split(id).0), format, &bytes, tags)
    }

    pub fn set_pinned(&self, id: &str, pinned: bool) -> Result<NoteMeta> {
        self.active().update_entry(id, |e| e.pinned = pinned)
    }

    pub fn set_tags(&self, id: &str, tags: &[String]) -> Result<NoteMeta> {
        let tags = normalize_tags(tags);
        self.active().update_entry(id, |e| e.tags = tags)
    }

    pub fn trash_note(&self, id: &str) -> Result<()> {
        transfer(&self.active(), &self.trash(), id).map(|_| ())
    }

    /// `id` is the note's name inside the trash, as returned by [`Vault::list_trash`].
    pub fn restore_note(&self, id: &str) -> Result<NoteMeta> {
        let area = self.active();
        let restored = transfer(&self.trash(), &area, id)?;
        area.meta(&restored, &area.load()?)
    }

    /// Permanent. Only reaches into the trash.
    pub fn delete_note(&self, id: &str) -> Result<()> {
        let trash = self.trash();
        fs::remove_file(trash.path(id)?)?;
        trash.save(trash.load()?)
    }

    pub fn empty_trash(&self) -> Result<()> {
        let trash = self.trash();
        let ids = trash.ids();
        if ids.is_empty() {
            return Ok(());
        }
        for id in ids {
            fs::remove_file(trash.dir.join(id))?;
        }
        trash.save(Index::default())
    }

    // ponytail: rescans every note per query; add an inverted index if vaults reach thousands of notes.
    pub fn search(&self, query: &str) -> Vec<SearchHit> {
        let needle = query.trim().to_lowercase();
        if needle.is_empty() {
            return Vec::new();
        }
        let area = self.active();
        let mut ids = area.ids();
        ids.sort_by_key(|id| id.to_lowercase());
        let (mut hits, mut content_only) = (Vec::new(), Vec::new());
        for id in ids {
            let path = area.dir.join(&id);
            let title = split(&id).0.to_string();
            let content = match fs::metadata(&path) {
                Ok(stat) if stat.len() <= MAX_TEXT_BYTES => {
                    fs::read(&path).map(|b| decode(&b)).unwrap_or_default()
                }
                _ => String::new(),
            };
            let hit = |line: usize, text: &str| SearchHit {
                id: id.clone(),
                title: title.clone(),
                line: line as u32,
                snippet: text.trim().chars().take(MAX_SNIPPET_CHARS).collect(),
            };
            let mut found: Vec<SearchHit> = content
                .lines()
                .enumerate()
                .filter(|(_, line)| line.to_lowercase().contains(&needle))
                .take(MAX_HITS_PER_NOTE)
                .map(|(i, line)| hit(i + 1, line))
                .collect();
            if title.to_lowercase().contains(&needle) {
                if found.is_empty() {
                    let preview = content.lines().find(|l| !l.trim().is_empty());
                    found.push(hit(0, preview.unwrap_or_default()));
                }
                hits.append(&mut found);
            } else {
                content_only.append(&mut found);
            }
        }
        hits.append(&mut content_only);
        hits.truncate(MAX_HITS);
        hits
    }

    /// Copies every active note into `dest`, renaming rather than overwriting.
    pub fn export(&self, dest: &Path) -> Result<usize> {
        fs::create_dir_all(dest)?;
        if fs::canonicalize(dest)? == fs::canonicalize(&self.root)? {
            return Err(Error("Choose a folder other than the vault itself".into()));
        }
        let mut taken: HashSet<String> = fs::read_dir(dest)?
            .flatten()
            .map(|e| e.file_name().to_string_lossy().to_lowercase())
            .collect();
        let area = self.active();
        let mut ids = area.ids();
        ids.sort();
        for id in &ids {
            let (stem, ext) = split(id);
            let free = first_free(stem, |s| {
                taken.contains(&format!("{s}.{ext}").to_lowercase())
            });
            let name = format!("{free}.{ext}");
            fs::copy(area.dir.join(id), dest.join(&name))?;
            taken.insert(name.to_lowercase());
        }
        Ok(ids.len())
    }
}

/// Whether a file-system event at `path` should refresh the UI: a note directly
/// in the vault root, or the active index. Trash and temp files are ignored.
pub fn is_vault_change(root: &Path, path: &Path) -> bool {
    if path.parent() == Some(root) {
        return path
            .file_name()
            .and_then(|n| n.to_str())
            .is_some_and(|n| validate_id(n).is_ok());
    }
    path == root.join(META_DIR).join(INDEX_FILE)
}
