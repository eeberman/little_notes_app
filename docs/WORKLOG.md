# Work log

## 2026-09-09 — Bootstrap
- Inspected project directory: present and empty. Found bundled Node runtime; no code changes existed.
- Wrote specification, initial decisions, status, workflows scaffold and cold-start entry point before implementation.
- Preserved all 11 initial tasks in local-only seed JSON.
- Verification: PowerShell directory listings succeeded; application verification pending.
- Next: fresh GPT-5.6 Sol agent implements from project documents.

## 2026-09-09 — Scaffold and dependencies
- Created Electron Forge with Vite, React and strict TypeScript configuration.
- Restricted packaged inputs so `.local`, documentation, tests, scripts and agent files are excluded from the application archive.
- Installed pinned dependency ranges with pnpm. pnpm initially rejected Forge's official git subdependency and blocked lifecycle scripts; install was repeated with exotic subdependencies enabled, then Electron, esbuild and electron-winstaller were explicitly approved.
- Verification: dependency resolution completed; application typecheck, tests, packaging and smoke remain pending.

## 2026-09-09 — Parent integration
- Sol agents stopped at usage limit. Parent retained files and continued; no reset consumed.
- Replaced unsafe close timeout, added single-instance lock and typed preload, implemented per-record draft controller, conflict-copy preservation and global search.
- Typecheck passed. Nine storage tests passed using elevated local process permissions; ordinary sandbox test launch failed with spawn EPERM.
- Forge packaging initially rejected pnpm linker layout; project-local workspace setting corrected and cached dependencies are being rebuilt.
- Package, desktop smoke, local provisioning and final docs remain pending.

## 2026-09-09 — Verified Windows delivery
- Corrected pnpm v11 workspace nodeLinker setting and rebuilt cached dependencies. Forge package/make then succeeded, creating portable executable, ZIP and Squirrel installer.
- Typecheck passed; all 12 storage/controller tests passed. Added controller cases for overlapping edits, failed close/retry and trash ordering.
- Smoke harness initially used an overly exact accessible button name and read process() after Electron closed. Corrected harness to use the action selector and close event. Subsequent packaged smoke passed; final documented-wrapper run evidence is .local/smoke-7SYxsa/result.json.
- Smoke verifies offline launch, global search, task changes, shortcuts, multi-note pending drafts, immediate-close flush, restart, daily reuse, clean external refresh, conflict-copy preservation, malformed-file reporting and isolated renderer.
- Inspected packaged screenshot; corrected malformed-file reporting so it does not falsely display a save failure. Final package was rebuilt and smoke repeated.
- Provisioned 11 real tasks, reran provisioning (no changes), and read the actual packaged user notebook to verify exact seed wording/dependency and no issues. Created desktop shortcut to the tested executable.
- ASAR audit passed: compiled bundles plus package.json only; no private seed paths/titles.
- Fresh agent audited from AGENTS only and identified stale status/workflow placeholders. Completed workflows, schema, recovery guidance, README, handoff and evidence; final re-audit pending.

## 2026-09-09 — Cold-start audit and visual polish
- Independent agent started from AGENTS only. Initial audit identified stale documentation; after updates, re-audit PASS at 18:51 UTC. Requirements, current state, executable checks, seed safety, recovery and next action are sufficient without chat context.
- Parent visual inspection of the actual notebook found long editor titles clipped horizontally. Switched title editor to a content-sized wrapping textarea; typecheck passed; Windows artifacts are being rebuilt and final smoke/screenshots will be refreshed.

## 2026-09-09 — Completion
- Long editor titles now wrap; final actual-notebook screenshot visually inspected and full title visible.
- Final rebuilt-package smoke PASS: .local/smoke-4ZVZJt/result.json. Actual-user read-only verification and ASAR privacy audit repeated successfully.
- Desktop shortcut launched the app for the user. Windows v1 and the cold-start handoff are complete; no required implementation work remains.

## 2026-09-09 — Daily-note and deletion follow-up
- Reproduced two reported behaviors in the packaged app: leaving a newly opened blank note saved an `Untitled` record, and plus in Daily Notes opened an ordinary blank note rather than today's dated page.
- Confirmed the folder action targeted `data`, whose Markdown files are nested under `records`; its OS error result was ignored by the renderer.
- Implemented transient pristine drafts, blank-unsaved discard, lazy new daily pages, context-aware Daily Notes plus, a visible Delete action, direct `data/records` opening and visible folder-open errors.
- Regression result: typecheck PASS; 14 focused tests PASS after first observing the blank-note regression test fail with one unwanted save.
- Because 1.0.0 remained open, built version 1.0.1 side by side under `out-1.0.1` without touching that process. Forge make produced the executable, ZIP and installer. Packaged smoke PASS with isolated data at `.local/smoke-XCdDnL`; ASAR audit found 11 allowlisted entries and zero unexpected files.
- Updated and verified the existing desktop shortcut target to the 1.0.1 portable executable. The user only needs to close the old process normally and relaunch the shortcut.

## 2026-09-09 — Apparent note loss after restart
- Investigated the report read-only before changing data. The real notebook contained 14 records, including all 3 ordinary notes; the single trash item predated the incident. A packaged read-only UI check showed all 3 under All Notes with zero errors.
- Reproduced the exact apparent-loss path in isolated packaged data: after creating notes in All Notes, closing and reopening reset navigation to Personal, hiding the saved notes. The new restart assertion failed against 1.0.1 with the UI accessibility snapshot showing `All Notes 2` while the active heading was Personal.
- Fixed the root cause by persisting only the selected navigation view in renderer local storage, with validation and an All Notes fallback so the first corrected launch shows existing notes. Markdown data, search text and selected-record state are not stored there.
- Typecheck and all 14 focused tests PASS. Forge make produced 1.0.2; final packaged smoke PASS at `.local/smoke-lADOXg`, including first-launch All Notes visibility and restoration after restart. Rechecked real data afterward: 14 records, 3 notes, 1 unchanged trash item.
- Updated and verified the desktop shortcut target to the 1.0.2 portable executable.

## 2026-09-09 — Empty All Notes screenshot and initial-snapshot recovery
- User screenshot disproved the navigation-only diagnosis: All Notes was active while every category count and record row was empty. Process inspection confirmed the running executable was 1.0.2 and Chromium's user-data directory was the correct `%LOCALAPPDATA%/Getting Stuff Done`, whose `data/records` still contained 14 valid files.
- Added a minimal controller regression in which the first list snapshot is empty and the next contains an existing note. It failed on 1.0.2 because only one read occurred, then passed after the bounded retry implementation.
- Added an explicit loading state, one 200 ms retry for an empty initial snapshot, refresh on focus/visibility, and a manual Reload notes action. No user Markdown files were changed.
- Typecheck PASS; all 15 tests PASS. Forge make produced 1.0.3 and packaged smoke PASS at `.local/smoke-HKty51`. Package shortcut updated to 1.0.3.
- After the user closed 1.0.2, a read-only Playwright launch of packaged 1.0.3 against the real notebook rendered all 3 ordinary notes in All Notes with zero error banners, then closed cleanly.

## 2026-09-09 — Persistence functionality follow-up
- User clarified that durable close/reopen behavior matters more than the existing note contents and supplied screenshots of 1.0.3 showing Daily Notes empty plus Explorer showing the documented records folder as empty.
- Concurrent read-only checks contradicted the Explorer view: PowerShell and `cmd /c dir` both enumerated all 14 ordinary/task Markdown files, with normal Archive attributes and user FullControl. The 1.0.3 process used the correct executable and user-data directory.
- Strengthened the empty-snapshot regression to require recovery after three consecutive empty list responses. Replaced the single retry with bounded backoff at 200/500/1000/2000/3000 ms, retaining loading state, focus/visibility refresh and manual Reload notes.
- Typecheck PASS; all 15 tests PASS. Forge make produced 1.0.4; packaged create/close/restart smoke PASS at `.local/smoke-HFTxSI`. Desktop shortcut updated to 1.0.4.

## 2026-09-09 — Public source publication
- Initialized the project as a Git repository for `https://github.com/eeberman/little_notes_app` after confirming the remote was public and empty.
- Expanded the output ignore rule to cover all versioned package directories. Audited the staged source for credentials and personal note content; `.local`, generated Vite files, dependencies and all packaged artifacts remain excluded.
- Replaced machine-specific documentation paths with portable equivalents before the initial public commit.
