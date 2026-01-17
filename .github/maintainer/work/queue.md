# Maintainer Queue

## Priority 1: Critical - Windows Path Security Bug

**Issues**: #28 (primary), #34, #20, #43, #48, #17, #29 (all duplicates)
**PRs with fixes**: #38 (best), #37, #18, #40, #26

### Root Cause
Path security check in `src/commands/install.ts` uses hardcoded `/`:
```typescript
if (!resolvedTargetPath.startsWith(resolvedTargetDir + '/')) {
```
Windows uses `\` so this always fails.

### Solution
Use `path.sep` from Node.js:
```typescript
import { sep } from 'path';
if (!resolvedTargetPath.startsWith(resolvedTargetDir + sep)) {
```

### Action
1. Implement fix in `src/commands/install.ts` (3 locations: lines ~197, ~247, ~373)
2. Update tests in `tests/commands/install.test.ts`
3. Close duplicate issues with consolidated response
4. Close PRs #38, #37, #18, #40, #26 with thanks

---

## Priority 2: Version Mismatch Bug

**Issue**: #42
**PR with fix**: #37 (also addresses this)

### Root Cause
`src/cli.ts` line 16 has hardcoded `.version('1.2.1')` while `package.json` is `1.3.0`.

### Solution
Read version dynamically from package.json:
```typescript
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
```

### Action
1. Update `src/cli.ts` to read version from package.json
2. Close #42 with explanation
3. This fix is included in Priority 1 implementation

---

## Priority 3: Triage Feature Requests

| Issue | Title | Action |
|-------|-------|--------|
| #6 | --yes should overwrite | Close - unclear value, stale |
| #9 | Document skill update workflow | Consider for docs |
| #13 | Support skill switch | Evaluate feasibility |
| #19 | Support GitLab | Future enhancement |
| #24 | AugmentCode support | Needs clarification |
| #32 | Version requirements | Future enhancement |
| #35 | Core contributor request | Respond with guidelines |
| #41 | Multiple skill reads | Docs or small enhancement |
| #47 | Empty title | Ask for details |
| #50 | Using with other models | Question - answer |

---

## Priority 4: Other PRs to Review

| PR | Title | Action |
|----|-------|--------|
| #49 | Auto-install for new developers | Evaluate approach |
| #39 | Safe deletion with trash | Low priority enhancement |
| #31 | Symlink support | Useful for development |
| #30 | Async spawn for spinner | Performance improvement |
| #27 | Version update | Superseded by #37 approach |
| #25 | Nix flake | Nice to have |
| #23 | README update | Review and consider |

---

## Other Bugs

| Issue | Title | Priority |
|-------|-------|----------|
| #51 | No SKILL.md files found | Needs investigation |
| #16 | Gemini CLI behavior | Needs investigation |
