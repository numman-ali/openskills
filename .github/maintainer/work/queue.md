# Maintainer Queue

## Recently Resolved (v1.3.1)

- Windows install path validation (issues #28, #34, #43, #48, #17, #29)
- CLI version mismatch (#20, #42)
- Root SKILL.md install failure (#51)

---

## Priority 1: Triage/Support Backlog

| Issue | Title | Recommended Action |
|-------|-------|--------------------|
| #9 | Document workflow/create script for updating skills | Ask for clarity + consider docs brief |
| #6 | --yes should overwrite | Close as resolved by current behavior or clarify scope |
| #35 | Core contributor request | Respond with contributor guidelines |
| #16 | Gemini CLI behavior | Investigate + request repro |
| #50 | How to use skills outside Claude | Provide guidance (AGENTS.md + OpenSkills flow) |

---

## Priority 2: Open PRs (Analysis Summary)

| PR | Title | Recommendation |
|----|-------|----------------|
| #49 | Auto-install note in AGENTS.md | Acceptable doc tweak; implement with neutral wording |
| #39 | Safe deletion with trash | Needs maintainer decision (dependency + behavior change) |
| #31 | Symlink install flag | Nice-to-have; decide if CLI should support symlink installs |
| #30 | Async spawn + spinner swap | Low priority; reconsider dependency swap |
| #27 | Version update to 1.3.0 | Obsolete; close with thanks |
| #26 | Path.relative + tests | Redundant; close with thanks (fixed in v1.3.1) |
| #25 | Nix flake | Optional; decide if we want official Nix support |
| #23 | README clarification | Likely superseded by recent README rewrite |

---

## Priority 3: Opportunities

- Add a short “Troubleshooting/FAQ” section (install modes, AGENTS.md, agent compatibility).
- Clarify default install scope (“project” vs “global”) in README if still confusing.
