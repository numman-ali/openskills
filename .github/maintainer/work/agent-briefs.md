# Agent Briefs

Generated: 2026-01-17
Repository: numman-ali/openskills

## Brief 1: Decide on Safe Deletion (PR #39)

**Intent**: Evaluate whether `remove`/`manage` should trash by default (with `--force` for permanent delete) and whether adding the `trash` dependency is acceptable.

**Context**:
- PR #39 adds `trash` dependency + `--force` flag
- Linux support caveats noted by dependency author

**Acceptance Criteria** (if accepted):
- Default deletion is explicit and documented
- `--force` provides permanent deletion
- Behavior is consistent across OSes (with graceful fallback)

**Constraints**:
- Avoid breaking workflows unexpectedly
- Prefer minimal dependency risk

**Approval needed**: Yes

---

## Brief 2: Decide on Symlink Install Flag (PR #31)

**Intent**: Decide whether to support `--symlink` for local installs to enable live updates.

**Context**:
- Manual symlink workflow already documented
- PR adds flag + tests

**Acceptance Criteria** (if accepted):
- `openskills install ./path --symlink` creates symlink
- Default behavior remains copy
- Tests cover symlink and broken link scenarios

**Approval needed**: Yes

---

## Brief 3: Decide on Nix Flake Support (PR #25)

**Intent**: Decide if the repo should ship a Nix flake for dev/build ergonomics.

**Context**:
- Adds `flake.nix`, `flake.lock`, README snippet
- Requires ongoing maintenance

**Approval needed**: Yes

---

## Brief 4: Triage Gemini CLI Behavior (ISSUE #16)

**Intent**: Understand why `Bash("openskills read <skill-name>")` affects Gemini CLI behavior.

**Information Needed**:
- Exact repro steps
- Agent/CLI versions
- Any logs or stderr output

**Approval needed**: Yes (response)

---

## Brief 5: Guidance for Non‑Claude Users (ISSUE #50)

**Intent**: Provide clear steps for using OpenSkills with other agents.

**Draft Guidance**:
- Install skills (`openskills install ...`)
- Sync to AGENTS.md (`openskills sync`)
- Ensure the agent reads AGENTS.md and can run `openskills read`

**Approval needed**: Yes (response)

---

## Brief 6: Clarify Skill Update Workflow (ISSUE #9)

**Intent**: Determine if we should document an upstream sync workflow or provide a script.

**Questions**:
- Are they asking for auto‑sync or a manual update recipe?
- Should this live in README or a separate doc?

**Approval needed**: Yes
