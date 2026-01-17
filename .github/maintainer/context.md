# Project Context

## Vision
OpenSkills is a universal skills loader for AI coding agents. It enables installing and managing Anthropic SKILL.md format skills across any AI agent (Claude Code, Cursor, Windsurf, Gemini, etc.), making it easy to extend agent capabilities with reusable skill definitions.

## Current Priorities
1. **Fix Windows compatibility** - Critical bug blocking ALL Windows users from installing skills
2. **Fix version mismatch** - CLI reports 1.2.1 when package.json is 1.3.0
3. **Consolidate duplicate issues** - 7 issues report the same Windows bug
4. **Review and respond to feature requests** - Growing backlog of enhancements

## Success Metrics
- Windows users can successfully install skills
- Version command shows correct package version
- Issue queue is triaged and duplicates consolidated
- Contributors receive timely, respectful responses

## Areas

| Area | Status | Notes |
|------|--------|-------|
| `src/commands/install.ts` | **Broken on Windows** | Path security check uses hardcoded `/` |
| `src/cli.ts` | Needs fix | Hardcoded version `1.2.1` |
| `tests/` | Good | 90 tests passing |
| `docs/` | Needs work | README could use more examples |

## Contribution Guidelines
- PRs are reviewed for intent and approach but implemented by maintainers
- Tests are required for bug fixes
- Keep changes focused and minimal
- Cross-platform compatibility is essential

## Tone
Technical, respectful, and appreciative. Thank contributors for their insights even when we implement fixes ourselves. Be direct about what we're doing and why.

## Out of Scope
- Merging external PRs directly (we implement fixes ourselves using PR insights)
- Features that add complexity without clear benefit
- Platform-specific workarounds when cross-platform solutions exist
