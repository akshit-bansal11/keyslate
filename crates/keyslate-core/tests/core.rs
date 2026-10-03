use std::fs;
use std::path::Path;

use keyslate_core::{
    is_vault_change, load_settings, normalize_tags, read_text_paths, sanitize_title, save_settings,
    set_vault_path, validate_id, vault_path, write_text, Format, Vault,
};
use serde_json::{json, Value};
use tempfile::TempDir;

fn vault() -> (TempDir, Vault) {
    let dir = tempfile::tempdir().unwrap();
    let vault = Vault::open(dir.path()).unwrap();
    (dir, vault)
}

fn names(dir: &Path) -> Vec<String> {
    let mut names: Vec<String> = fs::read_dir(dir)
        .unwrap()
        .map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
        .collect();
    names.sort();
    names
}

fn tags(list: &[&str]) -> Vec<String> {
    list.iter().map(|t| t.to_string()).collect()
}

#[test]
fn create_read_write_round_trip() {
    let (dir, v) = vault();
    let body = "line one\r\nline two\n";
    let meta = v.create_note("Ideas", Format::Md, body).unwrap();
    assert_eq!(meta.id, "Ideas.md");
    assert_eq!(meta.title, "Ideas");
    assert_eq!(meta.format, Format::Md);
    assert_eq!(meta.size, body.len() as u64);
    assert!(meta.modified > 0);
    assert!(!meta.pinned && meta.tags.is_empty());

    // Line endings survive untouched.
    assert_eq!(v.read_note("Ideas.md").unwrap().content, body);
    assert_eq!(
        fs::read(dir.path().join("Ideas.md")).unwrap(),
        body.as_bytes()
    );

    let meta = v.write_note("Ideas.md", "changed").unwrap();
    assert_eq!(meta.size, 7);
    assert_eq!(v.read_note("Ideas.md").unwrap().content, "changed");
    assert_eq!(v.list_notes().len(), 1);
}

#[test]
fn writes_leave_no_temp_files() {
    let (dir, v) = vault();
    v.create_note("A", Format::Txt, "x").unwrap();
    v.write_note("A.txt", "y").unwrap();
    v.set_pinned("A.txt", true).unwrap();
    assert_eq!(names(dir.path()), [".keyslate", "A.txt"]);
    assert_eq!(names(&dir.path().join(".keyslate")), ["index.json"]);
}

#[test]
fn write_to_a_missing_note_fails_instead_of_recreating_it() {
    let (dir, v) = vault();
    assert!(v.write_note("Gone.md", "x").is_err());
    assert!(names(dir.path()).is_empty());
}

#[test]
fn reads_are_lossy_and_strip_the_bom() {
    let (dir, v) = vault();
    fs::write(dir.path().join("Bom.md"), b"\xEF\xBB\xBFhello").unwrap();
    fs::write(dir.path().join("Latin.txt"), b"caf\xE9").unwrap();
    assert_eq!(v.read_note("Bom.md").unwrap().content, "hello");
    assert_eq!(v.read_note("Latin.txt").unwrap().content, "caf\u{fffd}");
    assert_eq!(v.list_notes().len(), 2);
}

#[test]
fn listing_ignores_other_files_and_subfolders() {
    let (dir, v) = vault();
    fs::write(dir.path().join("a.md"), "").unwrap();
    fs::write(dir.path().join("b.TXT"), "").unwrap();
    fs::write(dir.path().join("c.pdf"), "").unwrap();
    fs::create_dir(dir.path().join("sub.md")).unwrap();
    let mut ids: Vec<String> = v.list_notes().into_iter().map(|n| n.id).collect();
    ids.sort();
    assert_eq!(ids, ["a.md", "b.TXT"]);
}

#[test]
fn a_freshly_created_vault_gets_a_welcome_note_and_an_existing_one_does_not() {
    let dir = tempfile::tempdir().unwrap();
    assert!(Vault::open(dir.path()).unwrap().list_notes().is_empty());
    let fresh = Vault::open(dir.path().join("New")).unwrap();
    assert_eq!(fresh.list_notes()[0].id, "Welcome.md");
    assert!(Vault::open("relative/path").is_err());
}

#[test]
fn titles_are_sanitised() {
    assert_eq!(
        sanitize_title("  a<b>c:d\"e/f\\g|h?i*j  "),
        "a b c d e f g h i j"
    );
    assert_eq!(sanitize_title("tab\there\nnew"), "tab here new");
    assert_eq!(sanitize_title("trailing. . ."), "trailing");
    assert_eq!(sanitize_title(""), "Untitled");
    assert_eq!(sanitize_title(" ?? "), "Untitled");
    assert_eq!(sanitize_title(".."), "Untitled");
    assert_eq!(sanitize_title("con"), "_con");
    assert_eq!(sanitize_title("NUL.backup"), "_NUL.backup");
    assert_eq!(sanitize_title("COM1"), "_COM1");
    assert_eq!(sanitize_title("lpt9"), "_lpt9");
    assert_eq!(sanitize_title("COM0"), "COM0");
    assert_eq!(sanitize_title("Console"), "Console");
    // Capped on a char boundary, not a byte offset.
    assert_eq!(sanitize_title(&"é".repeat(200)), "é".repeat(120));
}

#[test]
fn create_dedupes_across_case_and_extension() {
    let (_dir, v) = vault();
    assert_eq!(
        v.create_note("Ideas", Format::Md, "").unwrap().id,
        "Ideas.md"
    );
    assert_eq!(
        v.create_note("ideas", Format::Txt, "").unwrap().id,
        "ideas 2.txt"
    );
    assert_eq!(
        v.create_note("IDEAS", Format::Md, "").unwrap().id,
        "IDEAS 3.md"
    );
    assert_eq!(v.create_note("a/b", Format::Md, "").unwrap().id, "a b.md");
}

#[test]
fn rename_rejects_collisions_and_allows_case_only_changes() {
    let (_dir, v) = vault();
    v.create_note("Ideas", Format::Md, "body").unwrap();
    v.create_note("Other", Format::Txt, "").unwrap();
    v.set_tags("Ideas.md", &tags(&["x"])).unwrap();

    let err = v.rename_note("Ideas.md", "other").unwrap_err();
    assert_eq!(err.to_string(), "A note named \"other\" already exists");

    let meta = v.rename_note("Ideas.md", "ideas").unwrap();
    assert_eq!(meta.id, "ideas.md");
    assert_eq!(meta.tags, ["x"]);
    assert_eq!(v.read_note("ideas.md").unwrap().content, "body");

    let meta = v.rename_note("ideas.md", "Plans").unwrap();
    assert_eq!((meta.id.as_str(), meta.format), ("Plans.md", Format::Md));
    assert_eq!(meta.tags, ["x"]);
    assert_eq!(v.list_notes().len(), 2);
}

#[test]
fn set_format_moves_metadata_and_refuses_to_collide() {
    let (dir, v) = vault();
    v.create_note("Ideas", Format::Md, "body").unwrap();
    v.set_pinned("Ideas.md", true).unwrap();
    v.set_tags("Ideas.md", &tags(&["work"])).unwrap();

    let meta = v.set_format("Ideas.md", Format::Txt).unwrap();
    assert_eq!(meta.id, "Ideas.txt");
    assert_eq!(meta.format, Format::Txt);
    assert!(meta.pinned);
    assert_eq!(meta.tags, ["work"]);
    assert!(!dir.path().join("Ideas.md").exists());
    assert_eq!(
        v.set_format("Ideas.txt", Format::Txt).unwrap().id,
        "Ideas.txt"
    );

    // A same-titled file dropped in from outside must not be overwritten.
    fs::write(dir.path().join("Ideas.md"), "external").unwrap();
    assert!(v.set_format("Ideas.txt", Format::Md).is_err());
    assert_eq!(v.read_note("Ideas.md").unwrap().content, "external");
}

#[test]
fn pin_and_tags_persist_and_tags_are_normalised() {
    let (dir, v) = vault();
    v.create_note("A", Format::Md, "").unwrap();
    v.set_pinned("A.md", true).unwrap();
    let raw = tags(&[" #Work ", "work", "", "#", "Zeta", "alpha", &"x".repeat(40)]);
    let meta = v.set_tags("A.md", &raw).unwrap();
    assert_eq!(meta.tags, ["alpha", "work", &"x".repeat(32), "zeta"]);

    let reopened = Vault::open(dir.path()).unwrap();
    let meta = &reopened.list_notes()[0];
    assert!(meta.pinned);
    assert_eq!(meta.tags.len(), 4);

    let many: Vec<String> = (0..30).map(|i| format!("t{i:02}")).collect();
    assert_eq!(normalize_tags(&many).len(), 20);

    let index: Value =
        serde_json::from_slice(&fs::read(dir.path().join(".keyslate/index.json")).unwrap())
            .unwrap();
    assert_eq!(index["version"], 1);
    assert_eq!(index["notes"]["A.md"]["pinned"], true);
}

#[test]
fn duplicate_copies_tags_but_not_the_pin() {
    let (_dir, v) = vault();
    v.create_note("A", Format::Md, "body").unwrap();
    v.set_pinned("A.md", true).unwrap();
    v.set_tags("A.md", &tags(&["t"])).unwrap();
    let copy = v.duplicate_note("A.md").unwrap();
    assert_eq!(copy.id, "A copy.md");
    assert!(!copy.pinned);
    assert_eq!(copy.tags, ["t"]);
    assert_eq!(v.read_note("A copy.md").unwrap().content, "body");
    assert_eq!(v.duplicate_note("A.md").unwrap().id, "A copy 2.md");
}

#[test]
fn trash_then_restore_keeps_tags_and_dedupes() {
    let (_dir, v) = vault();
    v.create_note("A", Format::Md, "first").unwrap();
    v.set_tags("A.md", &tags(&["keep"])).unwrap();
    v.set_pinned("A.md", true).unwrap();
    v.trash_note("A.md").unwrap();
    assert!(v.list_notes().is_empty());
    let trashed = v.list_trash();
    assert_eq!(trashed[0].id, "A.md");
    assert_eq!(trashed[0].tags, ["keep"]);

    // A second note with the same title is trashed alongside, not over, the first.
    v.create_note("A", Format::Md, "second").unwrap();
    assert!(!v.list_notes()[0].pinned);
    v.trash_note("A.md").unwrap();
    assert_eq!(v.list_trash().len(), 2);

    v.create_note("a", Format::Txt, "third").unwrap();
    let restored = v.restore_note("A.md").unwrap();
    assert_eq!(restored.id, "A 2.md");
    assert_eq!(restored.tags, ["keep"]);
    assert!(restored.pinned);
    assert_eq!(v.read_note("A 2.md").unwrap().content, "first");
    assert_eq!(v.list_trash().len(), 1);
}

#[test]
fn delete_and_empty_trash_only_touch_the_trash() {
    let (_dir, v) = vault();
    for title in ["A", "B", "C", "Keep"] {
        v.create_note(title, Format::Md, "").unwrap();
    }
    for id in ["A.md", "B.md", "C.md"] {
        v.trash_note(id).unwrap();
    }
    // An active note cannot be permanently deleted by id.
    assert!(v.delete_note("Keep.md").is_err());
    v.delete_note("A.md").unwrap();
    assert_eq!(v.list_trash().len(), 2);
    v.empty_trash().unwrap();
    assert!(v.list_trash().is_empty());
    v.empty_trash().unwrap();
    assert_eq!(v.list_notes()[0].id, "Keep.md");
}

#[test]
fn ids_from_the_ui_cannot_escape_the_vault() {
    for id in [
        "", ".", "..", "../x.md", "a/b.md", "a\\b.md", "C:\\x.md", "C:x.md", "x.exe", "x", ".md",
        "x.md.", "x.md ", "nul.md", "x\0.md",
    ] {
        assert!(validate_id(id).is_err(), "{id:?} should be rejected");
    }
    assert_eq!(validate_id("Ideas.md").unwrap(), Format::Md);
    assert_eq!(validate_id("a.b.TXT").unwrap(), Format::Txt);

    let outer = tempfile::tempdir().unwrap();
    fs::write(outer.path().join("x.md"), "secret").unwrap();
    let v = Vault::open(outer.path().join("vault")).unwrap();
    assert!(v.read_note("../x.md").is_err());
    assert!(v.write_note("../x.md", "pwned").is_err());
    assert!(v.trash_note("../x.md").is_err());
    assert!(v.restore_note("../../x.md").is_err());
    assert!(v.delete_note("..\\..\\x.md").is_err());
    assert_eq!(
        fs::read_to_string(outer.path().join("x.md")).unwrap(),
        "secret"
    );
}

#[test]
fn a_corrupt_index_is_set_aside_and_loses_no_notes() {
    let (dir, v) = vault();
    v.create_note("A", Format::Md, "body").unwrap();
    v.set_pinned("A.md", true).unwrap();
    let meta_dir = dir.path().join(".keyslate");
    fs::write(meta_dir.join("index.json"), "{ not json").unwrap();

    let notes = v.list_notes();
    assert_eq!(notes.len(), 1);
    assert!(!notes[0].pinned);
    assert_eq!(v.read_note("A.md").unwrap().content, "body");

    v.set_pinned("A.md", true).unwrap();
    assert!(v.list_notes()[0].pinned);
    let kept = names(&meta_dir);
    assert_eq!(kept.len(), 2);
    assert!(kept.iter().any(|n| n.starts_with("index.json.corrupt-")));
}

#[test]
fn index_entries_for_missing_files_are_pruned_on_write() {
    let (dir, v) = vault();
    v.create_note("A", Format::Md, "").unwrap();
    v.create_note("B", Format::Md, "").unwrap();
    v.set_pinned("A.md", true).unwrap();
    v.set_pinned("B.md", true).unwrap();
    fs::remove_file(dir.path().join("A.md")).unwrap();
    v.set_tags("B.md", &tags(&["t"])).unwrap();
    let index = fs::read_to_string(dir.path().join(".keyslate/index.json")).unwrap();
    assert!(!index.contains("A.md"));
    // A new note reusing the name starts clean.
    assert!(!v.create_note("A", Format::Md, "").unwrap().pinned);
}

#[test]
fn search_finds_lines_and_titles_case_insensitively() {
    let (_dir, v) = vault();
    v.create_note("Zebra", Format::Md, "first\n  the NEEDLE is here  \nlast")
        .unwrap();
    v.create_note("Needle notes", Format::Txt, "\n\nnothing relevant")
        .unwrap();
    v.create_note("Unrelated", Format::Md, "nope").unwrap();

    let hits = v.search("  needle ");
    assert_eq!(hits.len(), 2);
    // The title match sorts first even though "Zebra" has the content hit.
    assert_eq!((hits[0].id.as_str(), hits[0].line), ("Needle notes.txt", 0));
    assert_eq!(hits[0].snippet, "nothing relevant");
    assert_eq!((hits[1].id.as_str(), hits[1].line), ("Zebra.md", 2));
    assert_eq!(hits[1].title, "Zebra");
    assert_eq!(hits[1].snippet, "the NEEDLE is here");

    assert!(v.search("").is_empty());
    assert!(v.search("   ").is_empty());
    assert!(v.search("absent").is_empty());
}

#[test]
fn search_caps_hits_snippets_and_file_size() {
    let (dir, v) = vault();
    let long = format!("hit {}", "é".repeat(400));
    v.create_note("Long", Format::Md, &format!("{long}\n").repeat(9))
        .unwrap();
    let hits = v.search("hit");
    assert_eq!(hits.len(), 5);
    assert_eq!(hits[0].snippet.chars().count(), 160);

    for i in 0..45 {
        v.create_note(&format!("n{i}"), Format::Md, &"hit\n".repeat(6))
            .unwrap();
    }
    assert_eq!(v.search("HIT").len(), 200);

    let big = vec![b'q'; 5 * 1024 * 1024 + 1];
    fs::write(dir.path().join("Big.txt"), big).unwrap();
    assert!(v.search("qqq").is_empty());
}

#[test]
fn export_copies_notes_without_overwriting() {
    let (dir, v) = vault();
    v.create_note("A", Format::Md, "new").unwrap();
    v.create_note("B", Format::Txt, "b").unwrap();
    v.trash_note("B.txt").unwrap();
    v.create_note("C", Format::Txt, "c").unwrap();

    let out = tempfile::tempdir().unwrap();
    let dest = out.path().join("nested/export");
    fs::create_dir_all(&dest).unwrap();
    fs::write(dest.join("a.md"), "old").unwrap();

    assert_eq!(v.export(&dest).unwrap(), 2);
    assert_eq!(names(&dest), ["A 2.md", "C.txt", "a.md"]);
    assert_eq!(fs::read_to_string(dest.join("a.md")).unwrap(), "old");
    assert_eq!(fs::read_to_string(dest.join("A 2.md")).unwrap(), "new");

    assert_eq!(v.export(&out.path().join("fresh")).unwrap(), 2);
    assert!(v.export(dir.path()).is_err());
}

#[test]
fn settings_load_save_and_survive_corruption() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("config/settings.json");
    assert_eq!(load_settings(&path).unwrap(), Value::Null);
    assert_eq!(vault_path(&Value::Null), None);

    save_settings(&path, json!({ "theme": "dark" })).unwrap();
    set_vault_path(&path, Path::new("D:/Notes")).unwrap();
    let loaded = load_settings(&path).unwrap();
    assert_eq!(loaded, json!({ "theme": "dark", "vaultPath": "D:/Notes" }));
    assert_eq!(vault_path(&loaded), Some("D:/Notes".into()));

    // The UI saving a blob without (or with a stale) vaultPath does not move the vault.
    save_settings(&path, json!({ "theme": "light" })).unwrap();
    save_settings(&path, json!({ "theme": "light", "vaultPath": "E:/Old" })).unwrap();
    assert_eq!(
        load_settings(&path).unwrap(),
        json!({ "theme": "light", "vaultPath": "D:/Notes" })
    );
    assert_eq!(names(path.parent().unwrap()), ["settings.json"]);

    fs::write(&path, "garbage").unwrap();
    assert_eq!(load_settings(&path).unwrap(), Value::Null);
    let kept = names(path.parent().unwrap());
    assert_eq!(kept.len(), 1);
    assert!(kept[0].starts_with("settings.json.corrupt-"));
    set_vault_path(&path, Path::new("D:/Notes")).unwrap();
    assert_eq!(
        load_settings(&path).unwrap(),
        json!({ "vaultPath": "D:/Notes" })
    );
}

#[test]
fn text_file_helpers_filter_decode_and_write_atomically() {
    let dir = tempfile::tempdir().unwrap();
    let p = |name: &str| dir.path().join(name);
    fs::write(p("a.md"), b"\xEF\xBB\xBFalpha").unwrap();
    fs::write(p("b.JSON"), "{}").unwrap();
    fs::write(p("c.exe"), "binary").unwrap();
    fs::write(p("big.txt"), vec![b'x'; 5 * 1024 * 1024 + 1]).unwrap();
    fs::create_dir(p("folder.md")).unwrap();

    let files = read_text_paths(&[
        p("a.md"),
        p("b.JSON"),
        p("c.exe"),
        p("big.txt"),
        p("folder.md"),
        p("missing.txt"),
    ]);
    let got: Vec<(&str, &str)> = files
        .iter()
        .map(|f| (f.name.as_str(), f.content.as_str()))
        .collect();
    assert_eq!(got, [("a.md", "alpha"), ("b.JSON", "{}")]);

    write_text(&p("out.txt"), "saved").unwrap();
    write_text(&p("out.txt"), "saved again").unwrap();
    assert_eq!(fs::read_to_string(p("out.txt")).unwrap(), "saved again");
    assert!(!names(dir.path()).iter().any(|n| n.ends_with(".tmp")));
}

#[test]
fn only_root_notes_and_the_active_index_count_as_vault_changes() {
    let root = Path::new("/vault");
    for (path, expected) in [
        ("/vault/Ideas.md", true),
        ("/vault/Ideas.TXT", true),
        ("/vault/.keyslate/index.json", true),
        ("/vault/.Ideas.md.1-0.tmp", false),
        ("/vault/photo.png", false),
        ("/vault/sub/Ideas.md", false),
        ("/vault/.keyslate/trash/Ideas.md", false),
        ("/vault/.keyslate/trash/index.json", false),
        ("/other/Ideas.md", false),
    ] {
        assert_eq!(is_vault_change(root, Path::new(path)), expected, "{path}");
    }
}
