# OpenSkills - Universal Skills Loader for AI Coding Agents

Load specialized skills in any AI coding agent using Anthropic's SKILL.md format.

**Works with:** Claude Code, Cursor, Windsurf, Aider, or any agent with Bash support

## What Are Skills?

Skills are Anthropic's format for giving AI agents specialized procedural knowledge. Each skill is a folder containing:

- `SKILL.md` - Instructions with YAML metadata
- `references/` - Documentation loaded as needed
- `scripts/` - Executable code
- `assets/` - Templates and files

Skills use **progressive disclosure** - agents load detailed instructions only when needed, keeping context windows efficient.

## Quick Start

### 1. Install OpenSkills

```bash
git clone https://github.com/numman-ali/openskills
cd openskills
chmod +x bin/*
```

### 2. Install a Skill

```bash
# From GitHub (all skills in repo)
bin/install-skill anthropics/skills

# Specific skill
bin/install-skill anthropics/skills/pdf-editor

# To project directory
bin/install-skill owner/repo --target .agent/skills
```

### 3. Load a Skill

```bash
# In any AI coding agent with Bash support
bin/load-skill pdf-editor
```

The skill content loads into the agent's context with base directory for resource resolution.

## Why OpenSkills?

- ✅ **Universal** - Works in any agent with Bash support, not just Claude Code
- ✅ **Compatible** - Uses Anthropic's official SKILL.md format
- ✅ **Installable** - Pull skills from GitHub repos automatically
- ✅ **Portable** - No vendor lock-in, works everywhere
- ✅ **Standard** - Matches Claude Code's XML output format

## Integration with Projects

### Add to Your Project

```bash
# Copy loader to project
cp openskills/bin/load-skill .agent/bin/

# Install skills
bin/install-skill anthropics/skills/pdf-editor --target .agent/skills
```

### Add to AGENTS.md

```markdown
<skills_system priority="1">

## Available Skills

<usage>
Skills provide specialized procedural guidance for complex tasks.
Progressive disclosure: Skills expand detailed instructions only when loaded.

Load: .agent/bin/load-skill <skill-name>
</usage>

<available_skills>

<skill>
<name>pdf-editor</name>
<description>PDF manipulation and editing capabilities</description>
</skill>

</available_skills>

</skills_system>
```

## CLI Reference

### load-skill

```bash
# List all available skills
load-skill

# Load specific skill
load-skill <skill-name>
```

**Output format:**
```
Loading: pdf-editor
Base directory: ~/.openskills/pdf-editor

[SKILL.md content with YAML frontmatter and instructions]

Skill loaded: pdf-editor
```

### install-skill

```bash
# Install from GitHub
install-skill owner/repo                    # All skills from repo
install-skill owner/repo/skill-name         # Specific skill

# Custom target
install-skill owner/repo --target .agent/skills    # Project-local
install-skill owner/repo --target .claude/skills   # Claude Code native
install-skill owner/repo --target ~/.openskills    # Global (default)
```

## Directory Structure

OpenSkills checks three locations in priority order:

1. `.agent/skills/` - Project infrastructure skills
2. `.claude/skills/` - Claude Code native skills
3. `~/.openskills/` - Globally installed skills

## Creating Skills

See [docs/creating-skills.md](docs/creating-skills.md) for authoring guide.

**Minimal skill structure:**

```
my-skill/
└── SKILL.md
    ---
    name: my-skill
    description: What this skill does and when to use it
    ---

    # My Skill

    [Instructions in imperative form]
```

## Claude Code Integration (Optional)

OpenSkills is compatible with Claude Code's plugin marketplace:

```bash
# In Claude Code
/plugin marketplace add numman-ali/openskills
/plugin install openskills-loader@openskills
```

Or use the universal loader (works everywhere):

```bash
bin/load-skill <skill-name>
```

## Examples

See [examples/](examples/) for:
- `my-first-skill/` - Minimal skill template
- Integration examples with AGENTS.md

## Documentation

- [Getting Started](docs/getting-started.md) - Installation and usage
- [Creating Skills](docs/creating-skills.md) - Authoring guide
- [Integration](docs/integration.md) - Adding to projects

## License

Apache 2.0

## Attribution

OpenSkills implements Anthropic's Agent Skills specification:
- [Agent Skills Blog Post](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Anthropic Skills Repository](https://github.com/anthropics/skills)

SKILL.md format and progressive disclosure architecture by Anthropic.
Universal loader implementation by OpenSkills contributors.
