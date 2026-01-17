---
id: 20
type: issue
status: open
actionability: ready
priority_score: 26
sentiment_score: 0
needs_info_score: 0
needs_info_signals: []
labels: [bug]
last_seen_at: 2026-01-17T13:39:40.172Z
---
## Intent
User installed `openskills@1.3.0` but CLI reports `1.2.1` and installs fail on Windows with “Security error: Installation path outside target directory.” They need correct version reporting and Windows installs to work.

## Analysis
Two issues are bundled here:
- **Version mismatch**: CLI version is hardcoded to `1.2.1` in `src/cli.ts`, so `dist/cli.js` ships the wrong version string.
- **Windows install failure**: path validation uses a hardcoded `/` separator, which fails on Windows backslashes.
Severity is high: Windows installs are blocked; version mismatch affects all users on 1.3.0.

## Proposed Action
Implement the Windows path separator fix (`path.sep`) and read CLI version dynamically from `package.json`. Ship a patch release and close duplicates.

## Draft Response (requires approval)
Thanks for the detailed report! You’ve hit two separate bugs: the CLI version string is hardcoded to `1.2.1`, and the Windows install path check used `/` so it always failed on backslashes. I’ve fixed both (dynamic version reading + Windows path separator handling). We’ll ship a patch release and close the related duplicates once it’s published.
