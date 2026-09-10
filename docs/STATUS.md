# Current status

Updated 2026-09-10. Shipped release: **1.1.0**. Stage: stable Windows release with Windows-wide note capture.

## Repository and delivery snapshot

- Branch `main` matched `origin/main` at commit `5c6b8f9` (`Initial release of Getting Stuff Done`) before the current documentation-only reset.
- `package.json`, `forge.config.ts`, and `scripts/smoke.ts` all target 1.1.0 / `out-1.1.0`.
- Portable executable: `out-1.1.0/Getting Stuff Done-win32-x64/Getting Stuff Done.exe`.
- Portable ZIP: `out-1.1.0/make/zip/win32/x64/Getting Stuff Done-win32-x64-1.1.0.zip`.
- Squirrel installer: `out-1.1.0/make/squirrel.windows/x64/Getting Stuff Done-1.1.0 Setup.exe`.
- The normal desktop shortcut targets 1.1.0 with no arguments or hotkey. Start Menu action launchers target the same executable: New Note uses `--new-note` / `Ctrl+Alt+G`; Today uses `--today` / `Ctrl+Alt+D`.
- Source remote: `https://github.com/eeberman/little_notes_app`. Personal `.local` files and generated packages are untracked.

## Implemented and last verified

- Task lists, ordinary notes, daily notes, global search, autosave, close flush, revision conflicts, recovery copies, local trash, and direct records-folder access are implemented.
- Blank note/daily shells are lazy and disappear without disk writes when never edited.
- The last navigation view persists across restart. Initial empty record snapshots receive bounded retries plus focus/visibility/manual reload paths.
- `Ctrl+Alt+G` and `Ctrl+Alt+D` work through Windows shell launchers when the app is closed or running. The main process restores minimized/hidden windows and queues commands until the renderer is ready.
- In-app commands are `Ctrl+K`, `Ctrl+N`, `Ctrl+Alt+D`, `Ctrl+/`, and Escape for the guide. The guide is also mouse-accessible from the sidebar.
- Release verification: typecheck PASS; 17 Vitest tests PASS; Forge make PASS; packaged offline smoke PASS at `.local/smoke-IVpsZv`; 11-entry ASAR privacy allowlist PASS; shortcut property readback PASS.
- The packaged smoke covered cold `--new-note`, cold `--today`, warm and rapid repeated second-instance activation from a minimized window, title focus, contentful-draft preservation, and the existing persistence/conflict scenarios using synthetic data only.
- The Squirrel installer artifact was generated but its interactive installation flow was not exercised. The desktop shortcut uses the tested portable build.

See ACCEPTANCE for exact evidence and WORKFLOWS for reproducible commands. Release verification did not read or modify the default notebook.

## Pending work

The broader in-app keyboard set remains unimplemented: `Ctrl+1`–`Ctrl+5` view switching, `Alt+Up`/`Alt+Down` record movement, `Ctrl+S` force save, and `Ctrl+Enter` task toggle. No keyboard delete command is planned. If the user gives a newer request, it supersedes this list.

## Repository note

The 1.1.0 source and cold-start documentation are committed on `main` and published to `origin`. Generated packages, `.local` verification evidence, notebook data, and Windows shortcut files remain intentionally untracked.
