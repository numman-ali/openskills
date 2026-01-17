---
id: 28
type: issue
status: open
actionability: ready
priority_score: 50
agent_score: 100
agent_confidence: high
agent_rationale: Critical bug blocking all Windows users. Clear root cause identified. Multiple PRs with working solutions.
sentiment_score: 0
needs_info_score: 0
needs_info_signals: []
labels: [bug]
last_seen_at: 2026-01-17T13:39:40.172Z
---
## Intent
Reporter cannot install ANY skills on Windows. Every skill installation fails with "Security error: Installation path outside target directory". This is a critical bug blocking Windows platform entirely.

## Analysis
**Root Cause**: Path security check in `src/commands/install.ts` uses hardcoded forward slash `/`:
```typescript
if (!resolvedTargetPath.startsWith(resolvedTargetDir + '/')) {
```

On Windows:
- `path.resolve()` returns paths with backslash `\` (e.g., `D:\Desktop\project\.claude\skills`)
- The check appends forward slash `/` creating mixed separators
- `startsWith()` always fails because `D:\...\skills\my-skill` doesn't start with `D:\...\skills/`

**Severity**: Critical - blocks ALL Windows installations
**Scope**: 3 locations in install.ts (lines ~197, ~247, ~373)
**Duplicates**: #34, #20, #43, #48, #17, #29 (7 total issues)
**PRs with fixes**: #38 (best), #37, #18, #40, #26

## Proposed Action
1. Implement fix using `path.sep` from Node.js (approach from PR #38)
2. Update tests to use platform-agnostic path handling
3. Add Windows-specific test cases
4. Close all duplicate issues with consolidated response
5. Close related PRs with thanks to contributors

## Draft Response (requires approval)
```
This is now fixed! The issue was that our path security check used a hardcoded forward slash `/` which doesn't match Windows backslashes `\`.

The fix uses Node.js `path.sep` which automatically uses the correct separator for each platform.

Thank you @giggitygi for the excellent bug report with root cause analysis, and thanks to everyone who reported duplicates and contributed PRs - especially @didierhk, @letsgitcracking, and @cuiyiming007 whose PRs helped guide the implementation.

The fix will be in the next release.
```
