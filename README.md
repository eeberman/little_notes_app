# Getting Stuff Done

Getting Stuff Done is a local-first Windows desktop app for tasks, ordinary notes, and dated daily notes. It is implemented with Electron, React, and TypeScript. Markdown files on the user's machine are the source of truth; the app requires no account, server, internet connection, or built-in AI.

## Use the installed local build

Open the **Getting Stuff Done** desktop shortcut. It targets the packaged 1.1.0 executable kept in this repository's `out-1.1.0` directory.

- `Ctrl+Alt+G` works anywhere in Windows to open a fresh ordinary note.
- `Ctrl+Alt+D` works anywhere in Windows to open or create today's daily page.
- `Ctrl+K` focuses global search.
- `Ctrl+N` creates an ordinary note.
- `Ctrl+/` opens the shortcut guide; Escape closes it.
- Edits autosave. A pristine blank draft disappears when you leave it.
- **Delete** discards a pristine blank draft or moves a saved/contentful note to local trash.
- **Open notes folder** opens the Markdown record directory.

The ordinary desktop icon remains a normal launcher. The two global keys are backed by action launchers in the user's Start Menu and work whether the app is closed, minimized, or behind another window.

## Develop

Run commands from this directory in PowerShell:

```powershell
./scripts/dev.ps1 install
./scripts/dev.ps1 typecheck
./scripts/dev.ps1 test
./scripts/dev.ps1 start
./scripts/dev.ps1 make
./scripts/dev.ps1 smoke
```

The wrapper uses the bundled Codex Node runtime when present and otherwise uses Node 22+ and pnpm 11 from `PATH`. Tests and smoke runs use synthetic data; never point them at the default notebook.

## Project documentation

A new LLM starts at [AGENTS.md](AGENTS.md) and follows [the cold-start handoff](docs/HANDOFF.md). The remaining documents each have one job:

- [STATUS](docs/STATUS.md): what is true now and what to do next.
- [SPEC](docs/SPEC.md): required behavior and scope.
- [DECISIONS](docs/DECISIONS.md): architecture and tradeoffs.
- [WORKFLOWS](docs/WORKFLOWS.md): commands, data contracts, release, backup, and recovery.
- [ACCEPTANCE](docs/ACCEPTANCE.md): verified release evidence.
- [WORKLOG](docs/WORKLOG.md): concise history.

Source is published at <https://github.com/eeberman/little_notes_app>. Personal `.local` content, runtime notes, dependencies, and generated packages are excluded from Git.
