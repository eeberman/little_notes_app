# Product specification

## Product

Build **Getting Stuff Done**, a compact keyboard-friendly Windows desktop app for personal tasks, searchable notes, and a daily log. It is inspired by nvALT's fast search/edit loop but is a new Windows implementation, not a source port.

## Shipped v1 behavior

- Stack: Electron, React, TypeScript, and Electron Forge; one local user and one running instance per data root.
- Views: Personal, Work (urgent), Work (thoughts), Daily Notes, and All Notes.
- Tasks: create/edit, change category, complete/reopen, optional waiting-on text, and collapsible completed records.
- Notes: titled ordinary notes plus freeform daily notes. All Notes contains ordinary and daily notes, not tasks.
- Daily action: Today, `Ctrl+Alt+D`, and the Daily Notes add button open or reuse the local-calendar `YYYY-MM-DD` page. Opening a new blank daily page does not write a file until edited.
- Blank drafts: a newly created ordinary note remains transient until edited. Leaving it pristine or returning it to fully blank removes the draft without creating an `Untitled` file.
- Deletion: a visible Delete action discards a pristine blank draft and moves saved/contentful records to local trash.
- Search: live, case-insensitive, all-whitespace-term matching over title, body, and waiting-on text. `Ctrl+K` focuses search; `Ctrl+N` creates an ordinary note.
- Global capture: `Ctrl+Alt+G` opens a fresh ordinary note and `Ctrl+Alt+D` opens today's daily note from anywhere in Windows, including when the app is closed. Start Menu action launchers send allowlisted commands to the single app instance; no background process or global keyboard hook is used.
- Discoverability: `Ctrl+/` and a visible sidebar action open the shortcut guide; Escape closes it.
- Restart: autosaved content persists and the last navigation view is restored. Search text and selected record are intentionally not restored.
- Loading recovery: the first snapshot is loading, not confirmed empty. Empty snapshots retry with bounded delays of 200/500/1000/2000/3000 ms, focus/visibility refreshes the list, and an empty loaded view exposes Reload notes.
- Save state: visible saving/saved/error feedback, per-record debounced autosave, a close-time flush, and retry after failure.
- Delivery: packaged Windows app works offline from a desktop shortcut without a developer terminal.

## Persistence and trust boundary

- Runtime root defaults to `%LOCALAPPDATA%\Getting Stuff Done`; Markdown records live under `data\records`.
- One UTF-8 Markdown file per record with YAML metadata and a stable ID. Daily IDs are local dates. Exact schema is authoritative in WORKFLOWS.
- The Electron main process exclusively owns filesystem access. A context-isolated, sandboxed preload exposes the typed record API; renderer Node access and arbitrary navigation/windows are blocked.
- Writes use serialized atomic replacement and retain the previous successful version in `data\recovery`. Delete moves files to `data\trash`.
- Filesystem content is authoritative. Clean external changes reload. Dirty external conflicts preserve both versions and notify the user. Malformed records and failed saves surface errors without silent overwrite.
- Personal seed data remains in ignored `.local/seed.json`, is provisioned idempotently, and is excluded from source history and packages.

## Pending keyboard expansion — not shipped

The global capture and shortcut-reference slice shipped in 1.1.0. These broader in-app commands remain possible future work:

- View switching: `Ctrl+1` through `Ctrl+5` in sidebar order.
- Record movement: `Alt+Up` and `Alt+Down` through visible records.
- Force save: `Ctrl+S` flushes pending drafts.
- Task action: `Ctrl+Enter` completes or reopens the selected task.

Do not add a keyboard delete command without an explicit new decision; deletion remains a visible pointer action to avoid accidental data loss.

## Acceptance boundary

- Automated tests cover task lifecycle/category/waiting-on/search/restart, idempotent seeding, daily reuse/date rollover, blank drafts, save failures/retries, close flush, recovery, malformed metadata, invalid Windows title characters, external conflicts, and initial empty-snapshot recovery.
- App changes pass typecheck and focused tests, then Forge `make` and the packaged offline smoke on Windows with `GSD_DATA_ROOT` isolation.
- A release verifies executable, ZIP, installer, ASAR privacy allowlist, and desktop shortcut target/hotkey.
- Documentation identifies current versus pending behavior and gives a fresh agent enough context to continue without chat history.

## Exclusions

No cloud sync, reminders, recurrence, attachments, collaborative editing, full status board, mobile client, or built-in AI is planned for v1. Expand scope only on an explicit user request.
