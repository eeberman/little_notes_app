# Work log

This is a concise chronology, not current state. STATUS is authoritative for what exists now and what should happen next.

## 2026-09-09 — Initial Windows release

- Specified and built the Electron, React, TypeScript, and Forge application around local Markdown records.
- Added typed isolated IPC, per-record draft/save control, atomic replacement, recovery/trash, revision conflicts, in-memory search, daily notes, idempotent local seeding, and a packaged Playwright/Electron smoke harness.
- Produced a portable executable, ZIP, Squirrel installer, and desktop shortcut. Unit, packaged, offline, seed, and privacy verification passed using isolated or read-only checks as appropriate.

## 2026-09-09 — Release 1.0.1: blank drafts, daily add, delete, and folder access

- Reproduced blank `Untitled` files, the Daily Notes plus creating the wrong type, and the folder action exposing the parent directory without surfacing OS errors.
- Added renderer-owned pristine drafts, lazy daily pages, context-aware add behavior, visible recoverable Delete, direct `data\records` opening, and visible folder-open failures.
- Typecheck and 14 tests passed; packaged smoke passed against isolated data; built 1.0.1 side by side and retargeted the shortcut.

## 2026-09-09 — Release 1.0.2: apparent note loss after restart

- Read-only diagnosis showed the Markdown notes still existed. Isolated reproduction proved restart always reopened Personal, hiding notes saved under All Notes.
- Persisted only the validated navigation view with All Notes as migration fallback; search and record selection remain ephemeral.
- Typecheck, 14 tests, packaged restart smoke, and post-check data verification passed. Built 1.0.2 and updated the shortcut.

## 2026-09-09 — Release 1.0.3: empty initial renderer snapshot

- A later screenshot showed All Notes itself empty, disproving the navigation-only explanation. The correct data root still contained valid files.
- Added explicit loading, an initial empty-snapshot retry, focus/visibility refresh, and Reload notes. A regression failed before the fix and passed after it.
- Typecheck, 15 tests, packaged smoke, and a read-only packaged view of the default notebook passed. Built 1.0.3 and updated the shortcut.

## 2026-09-09 — Release 1.0.4: bounded empty-snapshot recovery

- Independent PowerShell and command-shell listings showed records while Explorer appeared empty. Strengthened the regression to require recovery after three consecutive empty snapshots.
- Replaced the single retry with bounded delays of 200/500/1000/2000/3000 ms while retaining focus/visibility refresh and manual reload.
- Typecheck and 15 tests passed. Forge made 1.0.4; packaged create/close/restart smoke passed at `.local/smoke-HFTxSI`; desktop shortcut was retargeted to 1.0.4.

## 2026-09-09 — Public source publication

- Initialized Git, audited tracked content, and published `main` to `https://github.com/eeberman/little_notes_app` at commit `5c6b8f9`.
- `.local`, dependencies, generated Vite content, and all versioned package directories remain ignored. Machine-specific documentation paths were replaced with portable forms.

## 2026-09-10 — Cold-start documentation reset

- Re-read every existing project document and inspected the actual source seams, package version, Forge output, smoke path, Git state/remote, release artifacts, desktop shortcut, and current shortcut implementation.
- Rebuilt all nine documentation files so a new LLM can start from AGENTS without conversation history. Separated 1.0.4 shipped behavior from the pending expanded-keyboard request and made that request the concrete next action.
- Removed obsolete session/agent narratives and stale “close the old window” instructions. Consolidated procedures and contracts in WORKFLOWS and current facts in STATUS.
- Found that `.local/package-audit.json` refers to an older pre-versioned `out` build. Rechecked the actual 1.0.4 ASAR read-only: 11 allowlisted entries, zero seed-title matches, and no local seed/root paths.
- No source, package, shortcut, or notebook data was changed. Runtime tests were not rerun for this documentation-only edit.
- Cold-start audit PASS: all local Markdown links resolve; version/output/smoke paths and the 15-test count match source; release artifacts and smoke evidence exist; stale/corrupt-text scans are clean; `git diff --check` passes; and the diff contains exactly the nine documentation files.

## 2026-09-10 — Release 1.1.0: Windows-wide capture

- Added allowlisted `--new-note` and `--today` launch commands with queued cold-start delivery and existing-window restore/focus through the single-instance seam.
- Shipped `Ctrl+Alt+G` for a fresh ordinary note, `Ctrl+Alt+D` for today's daily note, and an accessible shortcut guide opened by mouse or `Ctrl+/`. Retired `Ctrl+Shift+D`.
- Added reproducible desktop/Start Menu shortcut provisioning. The desktop icon remains a normal launcher; two Start Menu action launchers own the global keys.
- Typecheck and 17 tests passed. Forge produced 1.1.0 portable, ZIP, and installer artifacts; packaged smoke passed at `.local/smoke-IVpsZv`; ASAR and shortcut-property audits passed.
