# Agent entry point

Treat this repository as the complete project context. Previous chat history is optional.

Before changing anything, read `docs/HANDOFF.md`, then `docs/STATUS.md` and `docs/SPEC.md`. Read `docs/DECISIONS.md` before changing behavior or architecture. Read the relevant sections of `docs/WORKFLOWS.md` before running the app, testing, packaging, touching persistence, updating the desktop shortcut, or recovering data.

Keep personal content isolated. The real notebook is under `%LOCALAPPDATA%\Getting Stuff Done\data`; `.local/seed.json` and `.local/` evidence are untracked. Use temporary fixtures or `GSD_DATA_ROOT` for all tests. Preserve user files, existing recovery/trash data, unrelated working-tree changes, and versioned package directories.

Keep documentation authoritative while working:

- `SPEC.md`: required product behavior and acceptance boundary.
- `STATUS.md`: current release, verified facts, pending work, and next concrete action.
- `DECISIONS.md`: consequential choices, rejected alternatives, and effects.
- `WORKFLOWS.md`: executable user, development, release, persistence, backup, and recovery procedures.
- `WORKLOG.md`: concise chronological changes and verification outcomes.
- `ACCEPTANCE.md`: release evidence; never convert an old pass into a claim about new code.

Implementation is complete only after proportional automated checks, a packaged Windows smoke test for app changes, artifact/shortcut verification for a release, and a cold-start documentation audit. Report exact commands, failures, and untested areas. A development build alone is not delivery.
