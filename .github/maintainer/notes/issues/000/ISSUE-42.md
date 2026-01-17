---
id: 42
type: issue
status: open
actionability: ready
priority_score: 12
sentiment_score: 0
needs_info_score: 0
needs_info_signals: []
labels: [bug]
last_seen_at: 2026-01-17T13:39:40.172Z
---
## Intent
User installed `openskills@1.3.0` but `openskills --version` still prints `1.2.1`. They want the CLI to report the actual package version and the build/publish process corrected.

## Analysis
Root cause: CLI version is hardcoded in `src/cli.ts`, so `dist/cli.js` ships with a stale version string. Scope: all installs of 1.3.0; severity: medium (confusing but not blocking).

## Proposed Action
Read the version dynamically from `package.json`, rebuild, and ensure release artifacts are updated.

## Draft Response (requires approval)
Confirmed—`dist/cli.js` is shipping a hardcoded version string. I’ll update the CLI to read the version from `package.json` and publish a patch release so `openskills --version` matches the installed package.
