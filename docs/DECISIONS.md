# Decisions

## 2026-09-09 — Windows reimplementation
Chosen: new Electron/React/TypeScript application packaged with Forge. Alternative: port nvALT's macOS source or use a browser-only app. Reason: user selected a Windows desktop app, and this provides a Windows executable while retaining keyboard-first behavior. Consequence: a new implementation, not feature parity. Revisit only if native integration or footprint becomes a demonstrated issue.

## 2026-09-09 — Local Markdown as source of truth
Chosen: individual Markdown records plus YAML metadata and in-memory search. Alternative: SQLite or cloud storage. Reason: user selected readable local files for backup and future agent workflows. Consequence: implement careful atomic writes, validation, recovery and external-edit conflict handling. Revisit if measured scale or multi-device requirements change.

## 2026-09-09 — Separate project and personal content
Chosen: .local/seed.json ignored by Git and distribution, provisioned into local app data. Alternative: embed personal tasks in the package. Reason: preserve a cold-start seed without shipping personal information. Consequence: developer must explicitly seed this machine and verify idempotence.

## 2026-09-09 — Written context is a deliverable
Chosen: small AGENTS entry point with authoritative linked documents, updated per milestone. Alternative: rely on conversation history. Reason: user requires a new agent to cold start. Consequence: test handoff independently and keep verification/status current. Record future consequential choices below with alternatives and effects.

## 2026-09-09 — Forge with Vite and package allowlisting
Chosen: Electron Forge's Vite plugin, an ASAR archive, Squirrel installer and portable ZIP; explicitly exclude personal seed, docs, scripts and tests from packaging. Alternative: a hand-written Electron packaging flow. Reason: the required stack gains repeatable Windows artifacts while keeping personal content out of distribution. Consequence: dependency lifecycle scripts for Electron, esbuild and electron-winstaller must be explicitly approved during first install.

## 2026-09-09 — Integration continuation and save ownership
The requested Sol agent and its UI/storage agents stopped with an account usage-limit error after scaffold and initial implementation. Astra continued integration to fulfill the working-app request; no additional paid credits or resets were purchased. The initial cold-start implementation began from written context, and a separate final fresh-agent documentation audit passed at 18:51 UTC.

Chosen: a dedicated DraftController owns per-record drafts, timers and in-flight writes. Alternatives: React-effect autosaves and one global timer. Reason: edits across multiple records and edits arriving during writes must survive. Revision hashes detect stale writes; conflicting drafts become separate ordinary notes while the external original remains intact. Closing waits for successful flush; failures keep the app open for retry.

Chosen: pnpm workspace nodeLinker=hoisted. Forge rejected pnpm's default isolated layout; pnpm v11 requires the workspace YAML setting for this check. Configuration remains project-local.

## 2026-09-09 — Final implementation and distribution choices
Chosen: package allowlist contains only .vite compiled bundles and package.json. Alternative: broad source copy with exclusions. Reason: removes accidental personal-data inclusion and keeps distribution small. ASAR audit verifies the allowlist and absence of original seed titles.

Chosen: portable executable plus desktop shortcut is the default local launch. Forge also produces ZIP and Squirrel installer. Reason: direct tested launch without requiring a separate installer step. Tradeoff: keep the output directory in place; moving the project requires updating the shortcut. Installer installation flow is not separately tested.

Chosen: packaged Playwright Electron smoke with a dedicated GSD_DATA_ROOT and offline browser context. Alternative: unavailable Computer Use node_repl runtime. Reason: exercise actual packaged renderer and persistence without touching user records. Actual default notebook separately verified read-only against the seed. No manual desktop interaction is claimed.

Chosen: full YAML parser for externally edited metadata, SHA-256 content revisions, and ordinary-note conflict copies. Reason: accept valid YAML and preserve both competing versions, including task metadata. Extra metadata fields outside the documented schema are not retained on app save; store custom information in the body. Arbitrary external editors do not share the app's write lock.

## 2026-09-09 — Lazy blank notes and direct notes-folder access
Chosen: ordinary-note and new daily-page shells remain renderer-owned drafts until the user edits them; leaving a pristine draft or returning it to blank discards it without a file. Alternative: immediately write an `Untitled` or empty dated file and require explicit cleanup. Reason: opening a note should not create clutter. Contentful deletion still passes through the durable local trash workflow.

Chosen: Daily Notes plus reuses the Today action, and the folder action opens `data/records` rather than its parent `data`. Alternative: create an ordinary note from every non-task plus action and expose the storage root. Reason: list-local actions should match their context, and the user-facing folder action should reveal the Markdown files directly. OS folder-open errors are now surfaced in the app.

## 2026-09-09 — Preserve the selected list across restarts
Chosen: store only the selected navigation view in renderer local storage and restore it on launch, with All Notes as the fallback for missing or invalid state. Alternative: always reopen in Personal or persist the entire UI state. Reason: always resetting to Personal made intact ordinary notes appear deleted after restarting, while persisting only the view fixes that confusion without storing search text or editor content outside the Markdown model. All Notes is the migration fallback so existing notes are visible on the first corrected launch.

## 2026-09-09 — Recover from transient empty renderer snapshots
Chosen: distinguish loading from a confirmed empty list, use bounded backoff retries at 200/500/1000/2000/3000 ms, refresh on focus/visibility, and expose Reload notes. Alternative: trust the first empty IPC response indefinitely or poll continuously. Reason: real 1.0.2 and 1.0.3 launches used the correct data root containing 14 valid records while both the app and Explorer transiently presented it as empty. Bounded retries restore visibility without permanent polling or filesystem mutation.
