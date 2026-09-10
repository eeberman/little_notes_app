# Cold-start handoff

This file is the operational orientation for an LLM with no conversation history.

## First ten minutes

1. Read `STATUS.md` for the current release and exact next action.
2. Read `SPEC.md`; separate shipped requirements from explicitly pending requests.
3. Run `git status --short --branch` and inspect existing diffs before editing.
4. Read the relevant decision and workflow sections for the requested change.
5. Inspect the implementation seam named below. Verify behavior with synthetic data only.
6. Update STATUS, WORKLOG, affected workflows/contracts, and acceptance evidence before stopping.

Completion means the requested behavior is implemented and verified at the right seam. Do not rebuild, reseed, recover, delete, push, or alter the real notebook merely because a new session began.

## Project in one paragraph

Getting Stuff Done is a single-user Windows Electron application. React renders a three-pane task/note UI. The sandboxed renderer talks through a typed preload bridge to the Electron main process, which owns a local Markdown store. Records autosave through a renderer-side draft controller. Revision hashes, atomic replacement, recovery copies, local trash, and conflict copies protect data. Search is in memory. The packaged portable application and desktop shortcut are the tested delivery path.

## Code map

| Path | Responsibility |
| --- | --- |
| `src/main.ts` | Window lifecycle, IPC validation, filesystem ownership, close/flush handshake, folder opening. |
| `src/main/storage.ts` | Markdown schema, parsing, search, atomic writes, revisions, recovery, trash, watchers, daily notes. |
| `src/preload.ts` | Isolated typed IPC bridge exposed as `window.gsd`. |
| `src/renderer/App.tsx` | Navigation, search, editor, commands, transient drafts, user-facing state. |
| `src/renderer/controller.ts` | Draft ownership, debounce, write sequencing, retries, conflict/save behavior. |
| `src/renderer/types.ts` | Shared renderer/bridge types. |
| `tests/` | Storage and draft-controller regression tests. |
| `scripts/dev.ps1` | Reproducible command wrapper. |
| `scripts/smoke.ts` | Packaged Playwright/Electron smoke test using an isolated data root. |
| `forge.config.ts` | Package allowlist, makers, and versioned output directory. |

## Current handoff

Release 1.1.0 is built, verified, committed on `main`, and published to `origin`. The packaged executable, ZIP, installer, normal desktop shortcut, and two Start Menu action launchers exist locally; generated packages and machine-specific shortcuts remain intentionally untracked.

`Ctrl+Alt+G` opens a fresh note and `Ctrl+Alt+D` opens today's daily note from anywhere in Windows through `--new-note` and `--today` launchers. `Ctrl+/` or the sidebar opens the shortcut guide. The broader keyboard set in STATUS remains pending.

## Data safety

The default notebook is `%LOCALAPPDATA%\Getting Stuff Done\data`, outside this repository. The local seed and verification evidence live under ignored `.local/`. Every automated or exploratory write must use a fresh temporary root through `GSD_DATA_ROOT`; the packaged smoke already does this. Reading the default notebook is appropriate only when the user requests diagnosis or verification, and should remain read-only unless the user explicitly authorizes a data change.

The Markdown files are authoritative. Never infer deletion from an empty UI or an empty Explorer view alone: prior incidents showed valid files while a renderer snapshot or Explorer display was transiently empty. Use the checks in WORKFLOWS before any recovery action.
