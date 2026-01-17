---
id: 16
type: issue
status: closed
actionability: done
priority_score: 7
sentiment_score: 0
needs_info_score: 0
needs_info_signals: []
labels: [bug]
last_seen_at: 2026-01-17T19:25:46Z
---
## Intent
Prevent AGENTS usage text from triggering a `bash` call in Gemini CLI.

## Analysis
The `Bash("...")` example is misinterpreted by Gemini CLI. Updated generated usage text to plain shell invocation.

## Proposed Action
Respond noting the fix in v1.5.0; close as resolved.

## Draft Response (requires approval)
Posted and closed after v1.5.0 release.

## Resolution
Closed as resolved in v1.5.0; usage text updated to plain shell invocation.
