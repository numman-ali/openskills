# OpenSkills - Universal Skills Loader for AI Coding Agents

Install and load Anthropic SKILL.md format skills in any AI coding agent.

```bash
npm i -g openskills
openskills install anthropics/skills/pdf-editor
openskills load pdf-editor
```

**Works with:** Claude Code, Cursor, Windsurf, Aider, or any agent with Bash support

## What Are Skills?

Skills are Anthropic's format for giving AI agents specialized procedural knowledge. Each skill contains:

- `SKILL.md` - Instructions with YAML metadata
- `references/` - Documentation loaded as needed
- `scripts/` - Executable code
- `assets/` - Templates and files

Skills use **progressive disclosure** - agents load detailed instructions only when needed.

## Installation

```bash
npm i -g openskills
```

## Quick Start

### 1. Install a Skill

```bash
# Install globally (available in all projects)
openskills install anthropics/skills/pdf-editor

# Install to current project
openskills install anthropics/skills/pdf-editor --project
```

### 2. Load in AI Agent

```bash
# In Claude Code, Cursor, Windsurf, Aider:
openskills load pdf-editor
```

The skill content loads into context with base directory for resource resolution.

### 3. List Installed Skills

```bash
openskills list
```

## Commands

### install

Install skills from GitHub:

```bash
# Install all skills from repo (global)
openskills install anthropics/skills

# Install specific skill (global)
openskills install anthropics/skills/pdf-editor

# Install to current project
openskills install owner/repo --project

# From Git URL
openskills install https://github.com/owner/repo
```

### list

List all installed skills:

```bash
openskills list
```

Shows skills from:
- `.claude/skills/` (project-local)
- `~/.claude/skills/` (global)

### load

Load skill to stdout (for AI agents):

```bash
openskills load pdf-editor
```

Output format:
```
Loading: pdf-editor
Base directory: ~/.claude/skills/pdf-editor

[SKILL.md content]

Skill loaded: pdf-editor
```

### remove

Remove installed skill:

```bash
openskills remove pdf-editor
openskills rm pdf-editor  # alias
```

## Directory Structure

OpenSkills uses `.claude/skills/` - the standard Claude Code location:

- `~/.claude/skills/` - Global (available in all projects)
- `.claude/skills/` - Project-local (current directory only)

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
- ✅ Compatible: Can mix with native Claude skills

### Benefits

- ✅ **Universal** - Works in any agent with Bash support
- ✅ **Standard** - Uses `.claude/skills/` (Claude Code's location)
- ✅ **Simple** - One npm install, works everywhere
- ✅ **Compatible** - Coexists with native Claude Code skills
- ✅ **Open** - Install skills from any GitHub repo

## Integration with AGENTS.md

Add skills metadata to your AGENTS.md:

```xml
<skills_system priority="1">

<usage>
Skills provide specialized procedural guidance for complex tasks.
Load: openskills load <skill-name>
</usage>

<available_skills>

<skill>
<name>pdf-editor</name>
<description>PDF manipulation and editing capabilities</description>
</skill>

</available_skills>

</skills_system>
```

## Creating Your Own Skills

See [docs/creating-skills.md](docs/creating-skills.md) for authoring guide.

**Minimal skill:**

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

Publish to GitHub, users install with:
```bash
openskills install your-username/my-skill
```

## Examples

See [examples/](examples/) directory for:
- `my-first-skill/` - Minimal skill template

## Future Roadmap

After community feedback and RFC:
- [ ] Support for `.agent/skills/` (custom infrastructure skills)
- [ ] Custom skill directories via config
- [ ] Multiple skill directory priorities
- [ ] Skill templates generator

Current focus: **Simplicity - .claude/skills only**

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

SKILL.md format and progressive disclosure by Anthropic.
Universal CLI implementation by OpenSkills contributors.
