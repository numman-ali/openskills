# Project Context

## Vision
OpenSkills is a universal skills loader for AI coding agents. It enables installing and managing Anthropic SKILL.md format skills across any AI agent (Claude Code, Cursor, Windsurf, Gemini, etc.), making it easy to extend agent capabilities with reusable skill definitions.

## Current Priorities
1. **Close the loop on v1.5.0 fixes** - Ensure update workflow + Gemini usage change are confirmed and closed
2. **Resolve PR backlog** - Decide on symlink installs, safe deletion, spinner changes, Nix flake
3. **Improve onboarding docs** - Keep update guidance and agent-specific instructions clear
4. **Triage feature requests** - Consolidate duplicates and keep the queue actionable

## Success Metrics
- Update command works for typical git installs, with clear recovery steps
- Agent usage text avoids shell/tooling misunderstandings
- PR backlog stays small and decisions are explicit
- Issue queue is triaged and duplicates consolidated
- Contributors receive timely, respectful responses

## Areas

| Area | Status | Notes |
|------|--------|-------|
| `src/commands/install.ts` | Healthy | Windows path handling fixed |
| `src/cli.ts` | Healthy | Version now reads from package.json |
| `tests/` | Good | 103 tests passing |
| `docs/` | Improving | Update guidance and agent usage tips added |

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
