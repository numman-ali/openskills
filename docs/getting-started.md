# Getting Started with OpenSkills

## Installation

### 1. Clone OpenSkills

```bash
git clone https://github.com/numman-ali/openskills
cd openskills
chmod +x bin/*
```

### 2. Add to PATH (Optional)

```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH="$PATH:/path/to/openskills/bin"

# Or create symlinks
ln -s /path/to/openskills/bin/load-skill /usr/local/bin/load-skill
ln -s /path/to/openskills/bin/install-skill /usr/local/bin/install-skill
```

## Installing Skills

### From Anthropic's Repository

```bash
# Install all example skills
install-skill anthropics/skills

# Install specific skill
install-skill anthropics/skills/pdf-editor
```

### From Community Repositories

```bash
# Install from any GitHub repo
install-skill owner/skill-repository

# Install specific skill from monorepo
install-skill owner/skills-collection/specific-skill
```

### Install Locations

**Global (default):**
```bash
install-skill owner/repo
# → Installs to ~/.openskills/
```

**Project-local:**
```bash
install-skill owner/repo --target .agent/skills
# → Installs to .agent/skills/ in current project
```

**Claude Code native:**
```bash
install-skill owner/repo --target .claude/skills
# → Installs to .claude/skills/ for Claude Code integration
```

## Using Skills

### List Available Skills

```bash
load-skill
```

Output shows skills from all locations:
- `.agent/skills/` (project-local)
- `.claude/skills/` (Claude Code native)
- `~/.openskills/` (global)

### Load a Skill

```bash
load-skill <skill-name>
```

The skill loads into your agent's context with base directory for resource resolution.

## Integration with AI Agents

OpenSkills works in any AI coding agent with Bash tool support:

**Claude Code:**
```
Bash("load-skill pdf-editor")
```

**Cursor, Windsurf, Aider:**
```
Execute bash command: load-skill pdf-editor
```

## Verification

Test the installation:

```bash
# Install example skill
install-skill numman-ali/openskills/my-first-skill --target ~/.openskills

# Load it
load-skill my-first-skill
```

Expected output:
```
Loading: my-first-skill
Base directory: ~/.openskills/my-first-skill

[SKILL.md content]

Skill loaded: my-first-skill
```

## Next Steps

- [Creating Skills](creating-skills.md) - Learn to author your own skills
- [Integration](integration.md) - Add skills to your project's AGENTS.md
- [Anthropic's Skills Repository](https://github.com/anthropics/skills) - Example skills
