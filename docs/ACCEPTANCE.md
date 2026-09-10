# Release acceptance record

Updated 2026-09-10. This records evidence for shipped release 1.1.0. Evidence under `.local/` is machine-local and ignored by Git.

## Release 1.1.0

| Area | Result and evidence |
| --- | --- |
| Type safety | PASS: `./scripts/dev.ps1 typecheck`. |
| Focused tests | PASS: 17 Vitest tests across launch-command, storage, and draft-controller suites. New tests prove only `--new-note` and `--today` are accepted and preserve command-line order. |
| Packaged runtime | PASS: `./scripts/dev.ps1 make` produced the 1.1.0 portable executable, ZIP, and Squirrel installer under `out-1.1.0`. |
| Packaged UI | PASS: `./scripts/dev.ps1 smoke`, evidence `.local/smoke-IVpsZv/result.json` and `packaged-app.png`. The executable ran offline against a fresh synthetic `GSD_DATA_ROOT`. |
| Global command paths | PASS: cold `--new-note`, cold `--today`, warm `--new-note` from a minimized existing instance, and two rapid repeated activations. The warm path restored the window, created exactly the expected editor type, focused its title, retained contentful notes, and collapsed superseded pristine shells safely. |
| Shortcut guide | PASS: `Ctrl+/`, Escape, sidebar mouse access, close-button access, dialog semantics, and global-versus-in-app labels were exercised in the packaged app. |
| Existing behavior | PASS: `Ctrl+K`, `Ctrl+N`, `Ctrl+Alt+D`, search, task completion/reopen/category, multiple drafts, close flush, restart, daily reuse, external reload, conflict preservation, malformed-file reporting, and renderer isolation. |
| Package privacy | PASS: the 1.1.0 ASAR has 11 allowlisted entries limited to `.vite` output and `package.json`; no `.local/seed.json` or resolved repository path was found. |
| Windows shortcuts | PASS property readback: the desktop launcher targets 1.1.0 with blank arguments/hotkey; Start Menu New Note targets 1.1.0 with `--new-note` / `Alt+Ctrl+G`; Today uses `--today` / `Alt+Ctrl+D`. Windows normalizes the displayed modifier order. |
| Personal data | The 1.1.0 verification did not read or modify the default notebook. All runtime writes used synthetic data. |
| Documentation | PASS after the 1.1.0 cold-start audit recorded below. |

The Squirrel installer file was generated but its interactive installation flow was not tested. The shortcuts deliberately target the tested portable executable. The physical global key combinations were not pressed against the default notebook; their `.lnk` registration was verified by COM property readback and both underlying cold/warm launch-command paths were exercised with synthetic data.

## Pending keyboard expansion

`Ctrl+1`–`Ctrl+5`, `Alt+Up`/`Alt+Down`, `Ctrl+S`, and `Ctrl+Enter` remain unshipped. They are not part of the 1.1.0 acceptance result. No keyboard delete command exists.

## Cold-start audit

PASS: the final 1.1.0 audit confirmed all local Markdown links, documented version/output/smoke paths, required artifacts and smoke evidence, current shortcut text, the 11-entry ASAR privacy allowlist, and `git diff --check`.
