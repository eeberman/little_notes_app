# Agent entry point

Before work, read docs/HANDOFF.md, docs/SPEC.md, docs/STATUS.md, then docs/DECISIONS.md. Consult docs/WORKFLOWS.md before running, testing, packaging, changing persistence, or recovering data.

Maintain documentation during implementation: record consequential choices and alternatives in DECISIONS, changes and verification outcomes in WORKLOG, and current progress plus the next concrete action in STATUS. Update affected workflows and contracts with code changes. Keep each fact authoritative in one document and link elsewhere.

Personal content lives in .local/seed.json and runtime data, never in tracked source or distribution assets. Use synthetic fixtures for tests. Preserve existing user files. Distinguish implemented, tested, and pending work; report exact commands and failures honestly.

Completion requires the SPEC acceptance checks, a packaged Windows application and desktop shortcut, a cold-start documentation audit, and accurate final STATUS. Never infer completion from a passing development build alone.
