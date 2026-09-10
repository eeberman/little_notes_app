# Product specification

Build Getting Stuff Done, a personal Windows desktop app inspired by nvALT's fast keyboard search and note editing. Source reference: https://brettterpstra.com/projects/nvalt/ and https://github.com/ttscoff/nv . Implement a new Windows application, not a macOS source port.

## Accepted experience
- Electron, React, TypeScript, Electron Forge. Compact navigation/list/editor layout.
- Navigation: Personal, Work (urgent), Work (thoughts), Daily Notes, All Notes.
- Tasks: add/edit, move category, complete/reopen, optional waiting-on text, collapsible completed section.
- Seed the 11 records from .local/seed.json once, preserving text/categories. Serena's waiting-on text belongs to monthly dashboard task. Seed file must be available to a new local agent but excluded from version control and distribution.
- Today and the Daily Notes add action open/reuse one freeform dated note using the local calendar date. A new blank daily page is not written until edited. Past entries editable. Ordinary titled notes supported.
- Newly opened ordinary notes remain transient until edited and disappear when left blank. A visible Delete action discards unsaved blank notes and moves saved/contentful notes to local trash.
- Search title, body and waiting-on text while typing. Explicit new-note action. Ctrl+K search, Ctrl+N note, Ctrl+Shift+D today.
- Remember the selected navigation list across a normal close/reopen so persisted notes do not appear to vanish behind the default task view.
- Treat the first record snapshot as loading rather than an authoritative empty notebook until it completes. Retry one empty initial snapshot, refresh on window focus/visibility, and provide a manual Reload notes action when a loaded view is empty.
- Visible saving/saved/error states. Desktop shortcut opens packaged app offline, with no developer terminal required.

## Persistence and boundary
- Project: repository root.
- Runtime data: %LOCALAPPDATA%\Getting Stuff Done\data, separate from source/binaries. Open notes folder action opens `data\records`, where the Markdown files live.
- One Markdown file per record with YAML metadata: stable ID, type, title, timestamps, task category/status/waitingOn. Daily filenames YYYY-MM-DD.md; task filenames stable IDs. Define exact schema in WORKFLOWS during implementation.
- Files authoritative, in-memory search. Main process owns filesystem; typed isolated preload exposes list/read/save/search/trash operations.
- Debounced autosave, flush before close, atomic file replacement, previous successful recovery copy, local trash for deletion.
- External changes reload clean editors. On dirty conflict preserve both versions and inform user. Malformed records and save failures must not cause silent overwrites.

## Acceptance
- Test task lifecycle, category changes, waiting-on, idempotent seeding, daily reuse/date rollover, search and restart persistence.
- Test failed writes, recovery copies, malformed metadata, external conflicts and Windows-invalid title characters.
- Type checking, focused automated tests, production build; packaged application smoke test offline on this Windows machine, including shortcuts.
- Deliver source, Windows package, desktop shortcut, launch/backup/restore docs.
- Fresh agent given only project path and AGENTS.md can identify requirements, current state, verification commands and next action without chat history.

## Defaults and exclusions
One user, one PC, local Markdown, freeform daily pages. No cloud sync, reminders, recurrence, attachments, full status board, or built-in AI in v1. Astra planned; GPT-5.6 Sol implements. Document all material implementation choices and workflow changes as work proceeds.
