---
id: 51
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
User tried installing a repo with a root-level `SKILL.md` and got “No SKILL.md files found in repository.” They need installs to work when a repo is a single skill at the root.

## Analysis
Root cause: `installFromRepo` only searches subdirectories for `SKILL.md` and ignores a root-level `SKILL.md`. This breaks single-skill repos like `dpconde/claude-android-skill`.

## Proposed Action
Treat root `SKILL.md` as a valid single-skill repo during git installs and use the frontmatter name (fallback to repo name) for the install folder.

## Draft Response (requires approval)
Thanks for the report! The installer only searched subdirectories and missed `SKILL.md` at repo root, which is why your single-skill repo failed. I’ve updated the installer to treat root `SKILL.md` as a valid skill and to install it using the skill’s frontmatter name. This will ship in the next patch release.
