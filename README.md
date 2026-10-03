# Keyslate

A fully local, keyboard-first notes app for Windows.

Your notes are plain `.md` and `.txt` files in a folder you choose. There is no account, no sync, no telemetry and no network code: the app's content security policy allows the window to talk to its own Rust core and nothing else. Any other editor can open the same folder.

Every action is a command. Press `Ctrl+K` to see all of them, `F1` for the current shortcuts, and rebind any of them in Settings.

## Install

Download `Keyslate_<version>_x64-setup.exe` from the [latest release](https://github.com/akshit-bansal11/keyslate/releases/latest) and run it. `Keyslate-portable.exe` is the same app without an installer.

The builds are not code-signed, so Windows SmartScreen will warn on first run: choose "More info", then "Run anyway". `SHA256SUMS.txt` is published with each release, and each `.exe` carries a build provenance attestation:

```
gh attestation verify Keyslate-portable.exe --repo akshit-bansal11/keyslate
```

Keyslate needs the WebView2 runtime, which ships with Windows 11 and current Windows 10.

## What it does

- **Markdown and plain text.** Each note is one or the other; switch with `Ctrl+Shift+M`. Markdown notes get syntax highlighting, formatting commands, and a live preview beside the editor or on its own.
- **A vault of real files.** The default vault is `Documents\Keyslate`. Pins and tags live in `.keyslate\index.json` inside it, so the note files stay clean. Edits made by another program show up live.
- **Find anything.** `Ctrl+P` jumps to a note by title, or creates one if nothing matches. `Ctrl+Shift+F` searches the text of every note and lands on the matching line.
- **Import and export.** Import `.md` and `.txt` files from a dialog or by dropping them on the window. Export a note as its own file or as a standalone HTML page, or copy it as Markdown, rich text or plain text. Export the whole vault to a folder.
- **Smart paste.** Rich text pasted into a Markdown note becomes Markdown. `Ctrl+Shift+V` makes the next paste plain.
- **Themes.** Six built in, three dark and three light. Duplicate any of them to make your own, and share it as a JSON file. The theme editor warns when a colour pair is hard to read.
- **Customisation.** Editor font, text size, line height, line width, wrapping, line numbers, spell check, density, sort order, default note format, and every shortcut.
- **Summon from anywhere.** `Ctrl+Alt+N` brings the window forward with a new note, whatever app has focus. Change or clear it in Settings.
- **A trash, not a delete.** `Ctrl+Shift+Delete` moves a note to `.keyslate\trash`. Deleting for good asks first.

## Default shortcuts

All of these can be changed in Settings, under Shortcuts.

| Notes | |
| --- | --- |
| `Ctrl+N` | New note |
| `Ctrl+Shift+N` | New plain-text note |
| `F2` | Rename note |
| `Ctrl+T` | Edit tags |
| `Alt+P` | Pin or unpin |
| `Ctrl+Shift+D` | Duplicate |
| `Ctrl+Shift+M` | Switch between Markdown and plain text |
| `Ctrl+Shift+Delete` | Move to trash |
| `Ctrl+S` | Save now (notes also save as you type) |
| `Ctrl+O` | Import notes from files |
| `Ctrl+Shift+S` | Export note as a file |
| `Ctrl+Shift+C` / `Ctrl+Alt+C` | Copy note as Markdown / as rich text |

| Moving around | |
| --- | --- |
| `Ctrl+K` | Show all commands |
| `Ctrl+P` | Go to note |
| `Ctrl+Shift+F` | Search in all notes |
| `Ctrl+PageDown` / `Ctrl+PageUp` | Next / previous note |
| `Alt+E` / `Alt+L` / `Alt+F` | Focus the editor / the note list / the list filter |
| `Ctrl+,` | Settings |
| `F1` | Keyboard shortcuts |

| View | |
| --- | --- |
| `Alt+1` / `Alt+2` / `Alt+3` | Editor only / side by side / preview only |
| `Ctrl+E` | Cycle those three |
| `Ctrl+\` | Show or hide the sidebar |
| `Ctrl+=` / `Ctrl+-` / `Ctrl+0` | Larger / smaller / default text size |
| `Alt+Z` | Toggle word wrap |
| `Ctrl+Alt+T` | Next theme |

| Editing (Markdown notes) | |
| --- | --- |
| `Ctrl+B` / `Ctrl+I` / `Ctrl+Shift+X` | Bold / italic / strikethrough |
| `` Ctrl+` `` / `` Ctrl+Shift+` `` | Inline code / code block |
| `Ctrl+L` | Link |
| `Ctrl+H` | Cycle heading level |
| `Ctrl+Shift+8` / `Ctrl+Shift+7` / `Ctrl+Shift+9` | Bulleted / numbered / task list |
| `Ctrl+Enter` | Check or uncheck a task |
| `Ctrl+Shift+.` | Quote |
| `Alt+D` | Insert today's date |
| `Ctrl+F` | Find in note |
| `Ctrl+Shift+V` | Paste as plain text next |

In the note list: arrows move, `Enter` opens, `Delete` trashes, and typing starts filtering.

## Limits worth knowing

- Windows only, and unsigned.
- The vault is one flat folder. Tags organise notes; there are no nested notebooks.
- No images or attachments. The preview shows an image's alt text, because the app cannot fetch anything.
- Links in the preview are copied to the clipboard when clicked rather than opened.
- Shortcuts are single combinations; there are no chord sequences.
- Search is a linear scan of the vault. It is fast for thousands of notes and has not been measured beyond that.
- A second copy of the app can be opened on the same vault; the two do not coordinate.

## Development

Requires Node 24 and, to build the desktop app, a Rust toolchain with the MSVC build tools.

```
npm ci
npm run check      # format, organise imports, lint, typecheck (writes fixes)
npm test           # unit tests
npm run dev        # the UI alone in a browser, on an in-memory backend
npm run tauri dev  # the desktop app
```

`npm run check:ci` is the same gate without writing; it is what CI runs. `npm run test:e2e` drives the built UI from the keyboard with Playwright and scans it with axe. `cargo test -p keyslate-core` runs the vault tests.

### Layout

- `crates/keyslate-core`: all vault logic, with no dependency on Tauri: atomic writes, title and id validation, pins and tags, trash, search, settings I/O.
- `src-tauri`: the desktop shell. One thin command per backend method, native dialogs, the file watcher, the global shortcut.
- `src`: the UI. `src/lib/backend/backend.ts` is the single interface between UI and machine, with a Tauri implementation and an in-memory one for the browser and for tests.

### Releasing

Set the version in `Cargo.toml`, `src-tauri/tauri.conf.json` and `package.json`, commit, then push a matching tag:

```
git tag v0.1.0 && git push origin v0.1.0
```

The release workflow builds the installer, writes checksums, attests provenance and publishes the release.

### Accepted dependency advisories

`npm audit` reports GHSA-vfj7-8cjw-p6xm in `braces`, reached only through Stylelint, a development tool that globs this repository's own files. It is not in the shipped app. CI audits runtime dependencies at `--audit-level=high`. Review by 2027-01-03.

## License

MIT
