# OpenSkills - Universal Skills Loader for AI Coding Agents

[![npm version](https://img.shields.io/npm/v/openskills.svg)](https://www.npmjs.com/package/openskills)
[![npm downloads](https://img.shields.io/npm/dm/openskills.svg)](https://www.npmjs.com/package/openskills)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Install and load Anthropic SKILL.md format skills in any AI coding agent.

```bash
npm i -g openskills
openskills install anthropics/skills/pdf-editor
openskills read pdf-editor
```

> **Found this useful?** Follow me on [X @nummanthinks](https://x.com/nummanthinks) for updates and more AI tooling projects!

**Works with:** Claude Code, Cursor, Windsurf, Aider, or any agent with Bash support

---

## Features

- ✅ **Universal** - Works in any AI agent with Bash support (Claude Code, Cursor, Windsurf, Aider)
- ✅ **Standard** - Uses `.claude/skills/` (Claude Code's native location)
- ✅ **Simple** - One npm install, works everywhere
- ✅ **Compatible** - Coexists with native Claude Code skills
- ✅ **GitHub Install** - Pull skills from any GitHub repository
- ✅ **Progressive Disclosure** - Skills load detailed instructions only when needed
- ✅ **Type-Safe** - Written in TypeScript with 100% test coverage

## What Are Skills?

Skills are Anthropic's format for giving AI agents specialized procedural knowledge. Each skill contains:

- `SKILL.md` - Instructions with YAML metadata
- `references/` - Documentation loaded as needed
- `scripts/` - Executable code
- `assets/` - Templates and files

Skills use **progressive disclosure**: agents load detailed instructions only when needed, keeping context windows efficient.

## Installation

```bash
npm i -g openskills
```

## Quick Start

### 1. Install a Skill

```bash
# Recommended: Install to project (conflict-free with Claude Code)
openskills install anthropics/skills/pdf-editor --project

# Advanced: Install globally (only for unique custom skills)
openskills install my-org/custom-skill
```

### 2. Read in AI Agent

In Claude Code, Cursor, Windsurf, or Aider:

```bash
openskills read pdf-editor
```

The skill content outputs to stdout with base directory for resource resolution.

### 3. List Installed Skills

```bash
openskills list
```

## CLI Reference

### install

Install skills from GitHub:

```bash
# Recommended: Install to project (conflict-free)
openskills install anthropics/skills --project
openskills install anthropics/skills/pdf-editor --project

# Advanced: Install globally (only for unique custom skills)
openskills install my-org/unique-skill

# Install from Git URL
openskills install https://github.com/owner/repo --project

# Supports nested paths (plugin groupings)
openskills install anthropics/skills/document-skills/xlsx --project
```

### list

List all installed skills:

```bash
openskills list
```

Shows skills from:
- `.claude/skills/` (project-local)
- `~/.claude/skills/` (global)

### read

Read skill to stdout (for AI agents):

```bash
openskills read pdf-editor
```

Output format matching Claude Code:
```
Reading: pdf-editor
Base directory: ~/.claude/skills/pdf-editor

[SKILL.md content with YAML frontmatter]

Skill read: pdf-editor
```

### sync

Update AGENTS.md with installed skills:

```bash
# Sync all skills
openskills sync

# Interactive mode (select which skills to sync)
openskills sync --interactive
```

Scans .claude/skills/ and generates XML section in AGENTS.md.
Interactive mode shows checkboxes with (global) vs (project) labels.

### unsync

Remove skills section from AGENTS.md:

```bash
openskills unsync
```

Removes auto-generated skills section from AGENTS.md.

### remove

Remove installed skill:

```bash
openskills remove pdf-editor
openskills rm pdf-editor  # alias
```

## Directory Structure

OpenSkills uses `.claude/skills/` - Claude Code's standard location:

- `~/.claude/skills/` - Global (available in all projects)
- `.claude/skills/` - Project-local (current directory only, **recommended**)

**Why `.claude/skills/`?**
- ✅ Claude Code native location (zero friction)
- ✅ No directory confusion
- ✅ Works with Claude Code's native plugin system
- ✅ Community standard emerging

## Claude Code Compatibility

OpenSkills and Claude Code work together seamlessly:

**Coexistence:**
- ✅ Both read from `.claude/skills/` (same location)
- ✅ Project-local (`.claude/skills/`) has priority over global
- ✅ Claude Code leaves skills in place when plugins disabled
- ✅ openskills can read Claude Code marketplace skills

**Recommended Approach:**

**For custom/community skills:**
```bash
# Install to project (conflict-free)
openskills install owner/custom-skill --project
git add .claude/skills/
git commit -m "Add custom skills"
```

**For Anthropic official skills:**
- **Option A:** Use Claude Code natively: `/plugin install document-skills@anthropic-agent-skills`
- **Option B:** Use openskills: `openskills install anthropics/skills --project`

**Global Install Warning:**

If you install globally and the skill name matches an Anthropic marketplace skill (xlsx, pdf, docx, etc.), re-enabling that Claude Code plugin may overwrite your custom version.

**Solution:** Use `--project` flag for all custom skills to avoid conflicts.

## Creating Your Own Skills

See [docs/creating-skills.md](docs/creating-skills.md) for complete authoring guide.

**Minimal skill structure:**

```
my-skill/
└── SKILL.md
    ---
    name: my-skill
    description: What this skill does and when to use it
    ---

    # My Skill

    Instructions in imperative form
```

Publish to GitHub:

```bash
git init
git add .
git commit -m "Initial skill"
gh repo create my-skill --public --source=.
git push
```

Users install with:
```bash
openskills install your-username/my-skill
```

## Integration with AGENTS.md

Add skills to your AGENTS.md automatically:

```bash
# Install skills
openskills install anthropics/skills/pdf-editor

# Sync to AGENTS.md (auto-generates XML section)
openskills sync
```

This generates:

```xml
<skills_system priority="1">

<usage>
Skills provide specialized procedural guidance for complex tasks.
Load: openskills read <skill-name>
</usage>

<available_skills>

<skill>
<name>pdf-editor</name>
<description>PDF manipulation and editing capabilities</description>
</skill>

</available_skills>

</skills_system>
```

Remove skills section:

```bash
openskills unsync
```

## Examples

- [examples/my-first-skill](examples/my-first-skill/) - Minimal skill template
- [Anthropic's Skills](https://github.com/anthropics/skills) - Official example skills

## Why OpenSkills?

### vs Claude Code Native

**Claude Code:**
- ✅ Native `/plugin install` commands
- ❌ Only works in Claude Code
- ❌ Can't use in Cursor, Windsurf, Aider

**OpenSkills:**
- ✅ Works in ALL agents (Claude Code, Cursor, Windsurf, Aider)
- ✅ Simple: `npm i -g openskills`
- ✅ Standard: Uses `.claude/skills/` location
- ✅ Compatible: Coexists with native Claude skills
- ✅ Open: Install from any GitHub repo

## Requirements

- **Node.js** 18+ (for npm global install)
- **Git** (for cloning skill repositories)

## Troubleshooting

**Skill not found:**
```bash
openskills list  # Check installed skills
ls ~/.claude/skills/  # Verify global install
ls .claude/skills/  # Verify project install
```

**Git clone fails:**
```bash
# Verify repository is public
# Test manually: git clone https://github.com/owner/repo
```

**Permission denied:**
```bash
# Reinstall
npm uninstall -g openskills
npm i -g openskills
```

## Development

### Build

```bash
npm run build        # Build once
npm run dev          # Watch mode
npm run typecheck    # Type checking only
```

### Test

```bash
npm test             # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

### Local Testing

```bash
npm link
openskills list
```

## Future Roadmap

After community feedback and RFC:
- [ ] Support for custom skill directories (`.agent/skills/`, etc.)
- [ ] Multiple directory priorities
- [ ] Respect `.claude-plugin/plugin.json` metadata
- [ ] Skill templates generator
- [ ] Marketplace integration

**Current focus:** Simplicity and standards compliance (`.claude/skills/` only)

## Documentation

- [Getting Started](docs/getting-started.md) - Installation and usage
- [Creating Skills](docs/creating-skills.md) - Authoring guide
- [Integration](docs/integration.md) - AGENTS.md integration

## License

Apache 2.0

## Attribution

OpenSkills implements Anthropic's Agent Skills specification:
- [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Anthropic Skills Repository](https://github.com/anthropics/skills)

SKILL.md format and progressive disclosure architecture by Anthropic.
Universal CLI implementation by OpenSkills contributors.

---

**Not affiliated with Anthropic or Claude.** Claude, Claude Code, and Agent Skills are trademarks of Anthropic, PBC. This is an independent open-source project implementing Anthropic's publicly documented SKILL.md specification.
