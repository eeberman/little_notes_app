# Workflows and contracts

Use only the section relevant to the task. STATUS owns current version/path facts; this document owns procedures and data contracts.

## Use the app

Open **Getting Stuff Done** from the desktop shortcut. The portable executable needs the adjacent files in its unpacked output directory, so keep that whole directory intact. Normal use is local and offline.

The sidebar contains Personal, Work (urgent), Work (thoughts), Daily Notes, and All Notes. A task-list plus creates a task in that category; All Notes plus creates an ordinary note; Daily Notes plus opens today's page. Completed tasks live under the expandable Completed section.

Current keyboard commands:

| Command | Action |
| --- | --- |
| `Ctrl+Alt+G` | From anywhere in Windows, launch or raise the app and open a fresh ordinary note. |
| `Ctrl+Alt+D` | From anywhere in Windows, launch or raise the app and open/reuse today's daily note. |
| `Ctrl+K` | Focus global search. |
| `Ctrl+N` | Create an ordinary note. |
| `Ctrl+/` | Open the shortcut guide. |
| `Escape` | Close the shortcut guide. |

The ordinary desktop shortcut has no hotkey. The two Windows-wide keys belong to action launchers under the Start Menu's `Programs\Getting Stuff Done` folder. They launch the same packaged executable with `--new-note` or `--today`; the existing instance restores and handles the command if the app is already running.

Search matches every whitespace-separated term, case-insensitively, across title, body, and waiting-on text. Search includes all record types and completed tasks. All Notes includes ordinary and daily notes; tasks stay in their category views.

Edits autosave after 550 ms idle per record. Switching records is safe. Closing waits for all pending writes; a failed flush keeps the app open and exposes retry. A new ordinary note or daily shell is not persisted until edited. Leaving a pristine draft discards it. Delete moves saved/contentful records to `data\trash`.

The last navigation view survives a normal restart. Search text and record selection do not. Initial empty snapshots retry for about 6.7 seconds total; app focus/visibility triggers refresh, and a confirmed empty view offers Reload notes.

## Development

Run from the repository root in PowerShell. `scripts/dev.ps1` uses this machine's bundled Codex Node runtime when present; otherwise install Node 22+ and pnpm 11. Keep the lockfile, workspace YAML, and `.npmrc`; Forge requires the configured hoisted pnpm linker.

```powershell
./scripts/dev.ps1 install
./scripts/dev.ps1 typecheck
./scripts/dev.ps1 test
./scripts/dev.ps1 start
./scripts/dev.ps1 package
./scripts/dev.ps1 make
./scripts/dev.ps1 smoke
```

`install` uses the frozen lockfile. Initial dependency downloads require network access. `start` launches a development build. `package` produces the unpacked app. `make` rebuilds it and produces the portable folder, ZIP, and Squirrel installer. `smoke` expects the versioned executable path hard-coded in `scripts/smoke.ts`.

Restricted agent shells may fail Node worker or Electron child-process launches with `spawn EPERM`. Retry the same command with approved process permissions; an EPERM launch failure is not a test result.

## Verification and release

For renderer, main-process, or storage changes:

1. Add or update the smallest regression at the owning seam.
2. Run `./scripts/dev.ps1 typecheck` and `./scripts/dev.ps1 test`.
3. Bump `package.json` for a release and change both `forge.config.ts` `outDir` and the executable path in `scripts/smoke.ts` to the same version.
4. Run `./scripts/dev.ps1 make`, then `./scripts/dev.ps1 smoke`.
5. Inspect the generated ASAR. It should contain only `.vite` output and `package.json`:

```powershell
./node_modules/.bin/asar.ps1 list 'out-X.Y.Z/Getting Stuff Done-win32-x64/resources/app.asar'
```

6. Verify the ZIP and installer exist beneath `out-X.Y.Z/make`.
7. Update the desktop and Start Menu shortcuts only after the packaged smoke passes. In an agent sandbox, these locations may require explicit permission.
8. Record actual evidence in ACCEPTANCE and WORKLOG, current facts in STATUS, and run a cold-start audit from AGENTS without relying on chat.

Create or update all three shortcuts from the repository root:

```powershell
.\scripts\update-shortcuts.ps1 -Version 'X.Y.Z'
```

The script verifies the packaged executable before writing, preserves the ordinary no-argument/no-hotkey desktop launcher, and reads back the target, arguments, working directory, and hotkey for both Start Menu action launchers.

Keep old versioned output directories for rollback until the new shortcut launch is verified. Do not stop a running old build just to package; build side by side and ask the user to close and reopen normally.

## Seed and test isolation

The user's original task seed lives at ignored `.local/seed.json`. Provision it only when explicitly needed:

```powershell
./scripts/dev.ps1 seed
```

The script creates stable IDs `initial-01` through `initial-11`, preserves existing records, and writes `data/.seed-v1.json` after success. Rerunning after the marker exists changes nothing, including after a user deletes a seed task. Never remove the marker to refresh content.

`GSD_DATA_ROOT` overrides the application root. Unit tests use temporary OS directories. The packaged smoke creates a fresh `.local/smoke-*` root, seeds only synthetic records, sets the renderer offline, and writes result/screenshot evidence there. Automated writes must never target the default `%LOCALAPPDATA%\Getting Stuff Done` root.

## File format and process boundary

Default runtime root: `%LOCALAPPDATA%\Getting Stuff Done`. Files live in:

- `data\records`: authoritative Markdown records.
- `data\recovery`: previous successful versions.
- `data\trash`: timestamped deleted records.
- `data\.seed-v1.json`: local seed-completion marker.

Each record is UTF-8 Markdown with YAML front matter. Filenames equal metadata `id` plus `.md`. Daily IDs and filenames are local `YYYY-MM-DD`; tasks and ordinary notes use stable random IDs except seeded tasks.

Required fields:

- `id`
- `type`: `task`, `note`, or `daily`
- `title`
- `createdAt` and `updatedAt`: ISO timestamps

Task-only fields:

- `category`: `personal`, `work-urgent`, or `work-thoughts`
- `status`: `open` or `completed`
- optional `waitingOn`

The Markdown body is plain editable text. Valid YAML scalars are accepted. App saves rewrite supported metadata; place custom durable information in the body. Titles do not control filenames, so Windows-invalid title characters are allowed.

The main-process store calculates a SHA-256 revision from full file content, serializes writes by ID, writes and fsyncs a temporary file, then renames it into place. Before replacement it retains `recovery/<id>.md`. Malformed files stay untouched and appear as issues while valid records remain usable. A directory watcher notifies the renderer of external changes.

The preload exposes typed `GsdApi`: `list`, `read`, `save`, `search`, `today`, `trash`, `openDataFolder`, `onCommand`, `onChanged`, and `onBeforeClose`. The renderer has no direct filesystem or Node access. Launch commands are limited to `new-note` and `today`.

Clean external edits reload. Dirty stale saves produce a separate ordinary `(conflict copy)` while the external original remains. If the original was a task, category, status, and waiting-on data are placed in the copy body. Reconcile manually in All Notes. Avoid saving the same file simultaneously in the app and an unrelated editor.

## Diagnose missing notes before recovery

An empty UI or Explorer view is not proof of deletion. Keep diagnosis read-only:

1. Confirm the running executable/version and desktop-shortcut target.
2. List `%LOCALAPPDATA%\Getting Stuff Done\data\records` from PowerShell and a second independent view if necessary.
3. Inspect `data\trash`, `data\recovery`, and malformed-record messages without moving files.
4. Launch the packaged app against a synthetic root to separate application behavior from the default notebook.
5. Change or restore data only after identifying the exact failure and receiving authority for the mutation.

## Backup and restore

For a full backup, close the app successfully and copy the entire `data` folder, including `records`, `recovery`, `trash`, and the seed marker. Recovery copies are only the previous version; they are not a separate-device backup.

For a full restore, close the app, preserve the current `data` folder under a new name, copy the backup into `data`, reopen, and verify before removing anything. Never merge over newer records without comparison.

For one recovery or trash item, close the app and preserve the current target record first. Read the candidate's front-matter `id`, then copy it to `records/<id>.md`. Recovery filenames already match. Trash filenames include a timestamp suffix that must be removed from the restored filename; do not change the metadata ID to the trash filename. To compare without replacement, create a new ordinary note and paste the candidate body.

## Troubleshooting

- **Save failed:** keep the window open, resolve disk space or access, and choose Retry saving. Copy important unsaved text elsewhere before force-quitting.
- **Malformed file:** use the displayed path and repair the front matter or filename-ID match externally, or restore a known copy. Valid records remain usable.
- **Conflict copy:** compare it with the external original and keep the desired content.
- **Missing executable:** rebuild with `make`, preserve the unpacked folder, and update the desktop shortcut.
- **Missing seed:** generic clones and packages intentionally omit personal `.local` content; only provision from the authorized local seed.
