# Workflows and contracts

## Start using the app
Open the **Getting Stuff Done** desktop shortcut. It targets the portable 1.0.4 executable in `out-1.0.4/Getting Stuff Done-win32-x64/Getting Stuff Done.exe` under this project. Keep the entire folder together; the executable needs its adjacent files. A ZIP and optional Squirrel installer are produced by `make`. No server, account, terminal or internet is required for normal use.

Use the three task lists on the left. The plus button adds a task in a task list or an ordinary note in All Notes. In Daily Notes, plus opens today's dated page. Click an item to edit its title/body; task fields include List, Waiting on and Complete/Reopen. Completed tasks appear under the expandable Completed section. The visible Delete button moves saved notes to local trash.

Ctrl+K focuses search across every category, ordinary note and daily note, including completed tasks. Search matches all whitespace-separated terms against title, body and waiting-on text. Ctrl+N creates an ordinary note. Ctrl+Shift+D, Today, or plus within Daily Notes opens the page for today's local calendar date. Repeated Today uses the same page; past daily notes remain editable. All Notes includes ordinary and daily notes; tasks remain in their named lists.

The selected navigation list is remembered across a normal close/reopen. If you close while viewing All Notes, the next launch returns to All Notes. Search text and the selected record are intentionally not persisted.

The first record read displays Loading notes rather than an empty-notebook claim. Empty snapshots receive bounded backoff retries over several seconds, and returning focus to the app refreshes the list. A confirmed empty view includes Reload notes for an explicit retry.

New ordinary notes and never-edited daily pages are transient. If you leave one blank, it disappears without creating a file. Once text is entered, autosave creates the Markdown record. Delete discards a blank unsaved note immediately; contentful or already-saved notes are preserved under `data\trash`.

Edits save after 550 ms idle per record. You can switch records while saving. The save indicator reflects pending writes; a failed save retains drafts and offers Retry saving. Closing waits for all writes to succeed. If a write fails, the app stays open. Avoid force-quitting with unsaved drafts.

## Development commands
Run from the project in PowerShell. The wrapper finds this machine's bundled Node/pnpm and sets PATH for child processes; otherwise install Node 22 or later and pnpm 11 on PATH. The installed runtime here is under `%USERPROFILE%/.cache/codex-runtimes/codex-primary-runtime/dependencies/node`. Keep `pnpm-lock.yaml`, `pnpm-workspace.yaml` and `.npmrc` with the project. pnpm's hoisted node linker is required by Forge.

```powershell
./scripts/dev.ps1 install
./scripts/dev.ps1 typecheck
./scripts/dev.ps1 test
./scripts/dev.ps1 start
./scripts/dev.ps1 package
./scripts/dev.ps1 make
./scripts/dev.ps1 smoke
```

Install uses the lockfile. Initial downloads require network access. Electron/esbuild/electron-winstaller lifecycle builds are explicitly allowed in pnpm workspace configuration. `package` creates the unpacked Windows executable folder; `make` rebuilds it and produces a ZIP and Squirrel installer beneath the configured Forge output directory (`out-1.0.4` for the current release). `smoke` requires that current packaged folder. Run typecheck/tests before make, and smoke after make whenever app code changes.

The restricted agent shell can reject Node worker/child processes with `spawn EPERM`; rerun the same local test/build command with approved process permissions. This is a tooling failure, not a test pass. Do not disable Windows security settings.

## Seed and test isolation
The original 11 tasks live in `.local/seed.json`, ignored by Git and excluded from packaging. Provision this machine once using:

```powershell
./scripts/dev.ps1 seed
```

It creates stable IDs `initial-01` through `initial-11`. Existing records are preserved, and `data/.seed-v1.json` marks completion. Repeating the command after success does nothing, including after a user deletes a seed task. A partially interrupted seed can be rerun before the marker exists without overwriting existing records. Never remove the marker to refresh user content.

`GSD_DATA_ROOT` overrides the application root (the `data` folder lives beneath it), for both executable and seed script. The smoke script sets this to a fresh `.local/smoke-*` directory containing only synthetic data. It uses Playwright's Electron integration, switches the browser context offline, tests the packaged renderer, and records `result.json` plus a screenshot there. Failed runs preserve evidence in `.local/smoke-failure.png`. It never modifies the real user's notebook.

## File format and application boundary
Default root: `%LOCALAPPDATA%/Getting Stuff Done`. Runtime files are under `data/records`, `data/recovery`, and `data/trash`. **Open notes folder** opens `data/records` directly. Each record is UTF-8 Markdown with YAML front matter. The application writes quoted scalar metadata; ordinary YAML strings are accepted. The Markdown body remains plain editable text.

Required metadata: `id`, `type` (`task`, `note`, `daily`), `title`, `createdAt`, `updatedAt` (ISO timestamps). Tasks also have `category` (`personal`, `work-urgent`, `work-thoughts`), `status` (`open`, `completed`), and optional `waitingOn`. Supported fields are rewritten when saved; keep extra information in the body. Filenames must equal metadata ID plus `.md`. Daily IDs/filenames use local `YYYY-MM-DD`; ordinary and task IDs are stable random IDs, except initial seeded tasks. Titles may contain Windows-invalid filename characters because they do not control filenames.

A SHA-256 hash of the full file is the transient revision, never a persisted field. Main-process Storage validates records, serializes app writes per ID, writes/fsyncs a temporary file, and renames it into place. Before replacing a record it retains the previous version in `recovery/<id>.md`. Search uses loaded records; the filesystem is authoritative. A directory watcher refreshes the renderer. Malformed records remain untouched and appear as error messages while valid records stay usable.

The isolated preload exposes typed `GsdApi` from `src/renderer/types.ts`: list returns records/issues; read/search/today return records; save returns record/conflict; trash takes ID/revision; openDataFolder opens the fixed data directory; onChanged signals reload; onBeforeClose returns whether flush succeeded. Renderer code has no Node filesystem access. Main validates sender identity; new windows and arbitrary navigation are blocked. One app instance owns a data root at a time.

Clean external edits reload automatically, and externally deleted clean records disappear. Dirty external changes keep the draft. On stale save or deletion of its original file, the entire submitted draft is saved as a separate ordinary note named `(conflict copy)`; task category/status/dependency are included in the copy's body. The external original stays intact. Find the copy in All Notes and reconcile manually. Save errors retain the in-memory draft for retry. Local writes are serialized, but an unrelated external editor does not participate in the application's lock; avoid simultaneously saving the same file from two tools.

## Backup and restore
Close the app successfully, then copy the entire `data` folder to your chosen backup location, including hidden seed marker, recovery and trash. Local recovery copies protect against the previous edit only and are not a separate-device backup.

To restore a full backup: close the app; preserve the current data folder under a new name before copying the backup into `data`; then reopen. Keep the current folder until the restored data is verified. Never merge over newer records without comparing them.

To restore one recovery/trash item: close the app and copy the current record to a safe location first. Read the candidate's front-matter `id`; copy it into `records/<id>.md`. Recovery filenames already match; trash filenames include a timestamp suffix that must be removed in the restored filename. Do not change the metadata ID to match the timestamped trash name. Reopen and inspect content. For comparison without replacing the original, create a new ordinary note and paste the desired body.

## Troubleshooting
- Save failed: keep the window open, free disk space or restore write access, then Retry saving. Copy important unsaved text elsewhere before any force quit.
- Malformed file: use the displayed path; fix front matter and filename/ID match in an external editor, or restore a backup. Valid notes remain available.
- Conflict copy: compare the copy in All Notes with the external original and retain the desired text.
- Missing executable: run make; keep the unpacked folder intact and recreate the shortcut if the project was moved.
- Missing seed: personal `.local` content is intentionally absent from distributed packages. Generic packages start empty; only this local project has the original seed.

## Delivery evidence
Current outcomes and exact evidence locations are recorded in STATUS and ACCEPTANCE. WORKLOG preserves failures and fixes; DECISIONS explains tradeoffs. Update these records when changing behavior or delivery artifacts.
