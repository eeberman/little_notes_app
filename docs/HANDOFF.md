# Cold-start handoff

Start with AGENTS.md and its linked reading order. This repository is the authoritative project context; previous chat history is unnecessary. The Windows v1 is implemented and verified. Resume the exact remaining action in STATUS; do not rebuild or reseed merely because a new agent has started.

SPEC defines accepted behavior. WORKFLOWS contains executable setup/check/package commands, user workflows, persisted schema, IPC boundary and backup/restore. DECISIONS records alternatives and rationale. WORKLOG is chronological evidence; ACCEPTANCE records delivery checks.

The original 11 tasks live in `.local/seed.json` and have already been provisioned into the default runtime notebook. They are excluded from Git and package contents. Use synthetic data and GSD_DATA_ROOT for tests; never alter the user's notebook to test features.

Initial implementation used a fresh GPT-5.6 Sol agent, which read this project without conversation history. It and its subagents reached a usage limit; Astra completed integration and verification. A separate cold-start agent audited documentation; see STATUS/ACCEPTANCE for the latest outcome.

For new work, inspect actual files and current STATUS, update requirements/decisions when behavior changes, implement and verify, then refresh workflow/status/work-log evidence before stopping. Preserve existing data and uncommitted changes. The portable package is the tested default; keep its directory intact and verify desktop shortcut targets after moves/rebuilds.
