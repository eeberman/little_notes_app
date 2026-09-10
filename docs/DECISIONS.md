# Architecture and product decisions

Each entry records the selected approach, material alternative, reason, and consequence. Add a new entry when behavior, data safety, trust boundaries, delivery, or important workflow changes.

## Windows implementation

**Chosen:** Electron, React, TypeScript, and Electron Forge. **Alternative:** port nvALT's macOS source or ship a browser-only app. **Reason:** the product needs a Windows executable while retaining a compact keyboard-first interaction. **Consequence:** this is a new implementation with an intentionally narrower scope than nvALT.

## Markdown source of truth

**Chosen:** one Markdown file per record with YAML metadata and in-memory search. **Alternative:** SQLite or a cloud service. **Reason:** local files are readable, inspectable, and easy to back up. **Consequence:** the store must validate metadata, serialize local writes, replace atomically, retain recovery copies, detect stale revisions, and preserve conflict copies. Extra YAML fields are not retained on app save; durable custom information belongs in the body.

## Process boundary

**Chosen:** the Electron main process owns storage; a typed context-isolated preload exposes a narrow API. **Alternative:** renderer filesystem access. **Reason:** one trusted owner makes validation and write ordering enforceable. **Consequence:** renderer Node integration is disabled, IPC senders are validated, new windows/navigation are blocked, and filesystem features belong behind the bridge.

## Draft and save ownership

**Chosen:** `DraftController` owns per-record drafts, debounce timers, in-flight writes, close flush, and retry state. **Alternative:** React effects or one global save timer. **Reason:** users can edit multiple records and edit again while a write is active. **Consequence:** renderer changes should preserve controller ownership and add controller regressions for concurrency or close behavior.

## Safe blank and delete behavior

**Chosen:** ordinary-note and new-daily shells stay renderer-owned until edited; pristine/fully blank unsaved records are discarded, while saved or contentful records go to durable local trash. **Alternative:** immediately persist `Untitled` files or silently delete saved notes. **Reason:** exploratory creation should not make clutter, and intentional content should remain recoverable. **Consequence:** deletion stays a visible action; keyboard workflows deliberately exclude a delete hotkey.

## External changes and conflicts

**Chosen:** clean external changes reload, while a dirty stale save creates a separate ordinary note with `(conflict copy)` and leaves the external original intact. **Alternative:** last writer wins. **Reason:** silent overwrites are unacceptable for local files that may be edited elsewhere. **Consequence:** users reconcile copies manually in All Notes; task fields are embedded in the conflict copy body.

## Empty snapshot recovery and view restoration

**Chosen:** persist only the last navigation view; treat initial empty snapshots as provisional with bounded 200/500/1000/2000/3000 ms retries, refresh on focus/visibility, and expose Reload notes. **Alternative:** always open Personal and trust the first empty list forever, or poll continuously. **Reason:** those behaviors made intact notes appear deleted during observed failures. **Consequence:** search and selected record remain ephemeral, retries stop after a bounded window, and recovery never mutates Markdown.

## Personal-data separation

**Chosen:** keep the original seed in ignored `.local/seed.json`, provision it idempotently into the default app-data root, and exclude `.local`, docs, scripts, tests, source, and build metadata from packages. **Alternative:** embed personal tasks in the application. **Reason:** source and distributed artifacts must not leak personal content. **Consequence:** automated tests use synthetic roots, seed provisioning is an explicit local workflow, and release audits inspect the ASAR allowlist.

## Packaging and local launch

**Chosen:** versioned Forge output directories, an ASAR containing only compiled `.vite` bundles plus `package.json`, a portable executable, ZIP, Squirrel installer, and desktop shortcut. **Alternative:** install-only delivery or a broad package copy with exclusions. **Reason:** the portable build is directly smoke-testable and supports side-by-side rollback. **Consequence:** every release keeps package version, Forge output, smoke path, and shortcut target aligned. Moving/removing an output directory breaks a shortcut pointing into it.

## Windows-wide capture

**Chosen:** keep a normal desktop launcher and install two Start Menu `.lnk` action launchers with `Ctrl+Alt+G --new-note` and `Ctrl+Alt+D --today`. The main process allowlists commands, queues cold-start commands until the renderer subscribes, and forwards warm commands through the existing single-instance seam after restoring the window. **Alternative:** Electron global shortcuts with a permanently running background process, or commandeering common keys such as `Ctrl+N` and `Ctrl+Shift+D`. **Reason:** shell hotkeys work when the app is closed and the chosen app-specific prefix avoids common workflows. **Consequence:** each action needs its own shortcut file; shortcut properties and packaged cold/warm command paths are release evidence.

## Test boundary

**Chosen:** Vitest for storage/controller behavior and Playwright's Electron integration for an offline packaged smoke using a fresh `GSD_DATA_ROOT`. **Alternative:** development-renderer checks or manual clicks only. **Reason:** packaged behavior and persistence must be exercised without touching the real notebook. **Consequence:** source checks alone do not constitute a release; real-notebook checks remain separately authorized and read-only.

## Documentation as project memory

**Chosen:** a short AGENTS entry point plus single-purpose linked documents maintained with code. **Alternative:** depend on conversation history or duplicate state across files. **Reason:** a fresh LLM must resume safely from the repository alone. **Consequence:** STATUS owns current/pending state, SPEC owns requirements, WORKFLOWS owns procedures/contracts, ACCEPTANCE owns evidence, DECISIONS owns rationale, and WORKLOG owns chronology.
