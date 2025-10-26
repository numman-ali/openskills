# Getting Started with OpenSkills

## Installation

```bash
npm i -g openskills
```

## Installing Skills

### From Anthropic's Repository

```bash
# Install all example skills
openskills install anthropics/skills

# Install specific skill
openskills install anthropics/skills/pdf-editor

# Install from plugin group
openskills install anthropics/skills/document-skills/xlsx
```

### From Community Repositories

```bash
# Install from any GitHub repo
openskills install owner/skill-repository

# Install specific skill from monorepo
openskills install owner/skills-collection/specific-skill
```

### Install Locations

**Project-local (recommended):**
```bash
openskills install owner/repo --project
# → Installs to .claude/skills/ (current directory)
# → Conflict-free with Claude Code plugins
# → Commit to git for team sharing
# → Only available in this project
```

**Global (advanced):**
```bash
openskills install owner/unique-skill
# → Installs to ~/.claude/skills/
# → Available in all projects
# → ⚠️ May conflict with Claude Code marketplace skills
```

## Using Skills

### List Available Skills

```bash
openskills list
```

Output shows skills from both locations:
- `.claude/skills/` (project-local) - shown first
- `~/.claude/skills/` (global) - shown second

### Load a Skill

```bash
openskills load <skill-name>
```

The skill loads with base directory for resource resolution:

```
Loading: pdf-editor
Base directory: ~/.claude/skills/pdf-editor

[SKILL.md content with YAML frontmatter and instructions]

Skill loaded: pdf-editor
```

### Remove a Skill

```bash
openskills remove <skill-name>
```

Removes from project-local if found there, otherwise global.

## Integration with AI Agents

OpenSkills works in any AI coding agent with Bash tool support:

**Claude Code:**
```
Bash("openskills load pdf-editor")
```

**Cursor, Windsurf, Aider:**
```
Execute: openskills load pdf-editor
```

The output loads into agent's context with base directory for resolving references.

## Verification

Test the installation:

```bash
# Install example skill from openskills
openskills install numman-ali/openskills/my-first-skill

# List it
openskills list

# Load it
openskills load my-first-skill
```

## Global vs Project-Local

### Global Install (Recommended for personal skills)

```bash
openskills install anthropics/skills/pdf-editor
```

**Benefits:**
- ✅ Install once, use everywhere
- ✅ No per-project setup
- ✅ Stored in `~/.claude/skills/`

**Use when:**
- Personal productivity skills
- General-purpose utilities
- Skills you use across many projects

### Project Install (Recommended for team projects)

```bash
cd your-project/
openskills install anthropics/skills/pdf-editor --project
git add .claude/skills/
git commit -m "Add PDF editing skill"
```

**Benefits:**
- ✅ Version controlled with project
- ✅ Team gets same skills on clone
- ✅ Project-specific customizations
- ✅ Stored in `.claude/skills/`

**Use when:**
- Team collaboration
- Domain-specific skills
- Company internal skills
- Ensures consistency across team

## Next Steps

- [Creating Skills](creating-skills.md) - Learn to author your own skills
- [Integration](integration.md) - Add skills to your project's AGENTS.md
- [Anthropic's Skills Repository](https://github.com/anthropics/skills) - Browse example skills
