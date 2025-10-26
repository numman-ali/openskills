# Integrating Skills into Your Project

Guide for adding OpenSkills to your AI agent project.

## Quick Integration

### 1. Install OpenSkills Globally

```bash
npm i -g openskills
```

### 2. Install Skills

```bash
# Recommended: Install to project (conflict-free)
openskills install anthropics/skills/pdf-editor --project

# OR install globally (advanced)
openskills install my-org/unique-skill
```

### 3. Add to AGENTS.md

```markdown
<skills_system priority="1">

## Available Skills

<usage>
Skills provide specialized procedural guidance for complex tasks.
Progressive disclosure: Skills expand detailed instructions only when loaded.

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

### 4. Load in AI Agent

In Claude Code, Cursor, Windsurf, Aider, etc.:

```bash
# Using global CLI
Bash("openskills load pdf-editor")

# OR if openskills in PATH
openskills load pdf-editor
```

## AGENTS.md XML Format

OpenSkills generates XML output matching Claude Code's format:

```xml
<skills_system priority="1">

<usage>
[Instructions on how skills work]
</usage>

<available_skills>

<skill>
<name>skill-name</name>
<description>Full description...</description>
</skill>

</available_skills>

</skills_system>
```

This format:
- ✅ Matches Anthropic's specification
- ✅ Uses priority levels for LLM parsing
- ✅ Provides progressive disclosure metadata
- ✅ Works universally across agents

## Skill Discovery Paths

OpenSkills checks three locations in priority order:

1. `.agent/skills/` - Project infrastructure skills (highest priority)
2. `.claude/skills/` - Claude Code native skills
3. `~/.openskills/` - Globally installed skills (lowest priority)

## Project-Local vs Global

### Project-Local Skills (Recommended for team projects)

```bash
# Install to project
openskills get owner/repo --target .agent/skills

# Commit .agent/skills/ to git
git add .agent/skills/
git commit -m "Add skills for team"
```

Benefits:
- ✅ Team members get same skills
- ✅ Version controlled
- ✅ Project-specific customization

### Global Skills (Recommended for personal use)

```bash
# Install globally
openskills get owner/repo

# Available across all projects
cd any-project/
openskills load skill-name
```

Benefits:
- ✅ One-time install
- ✅ Available everywhere
- ✅ No project bloat

## Advanced: Auto-Generate Skills Table

For projects with many skills, auto-generate the AGENTS.md section:

```bash
# List skills as XML
openskills list --format xml > skills-section.md

# Include in AGENTS.md
cat skills-section.md >> AGENTS.md
```

## Claude Code Native Integration (Optional)

OpenSkills is compatible with Claude Code's plugin system:

```bash
# In Claude Code
/plugin marketplace add numman-ali/openskills
```

But the universal CLI works everywhere:

```bash
# Works in any agent
openskills load <skill-name>
```

## Example Workflows

### Workflow 1: PDF Processing Project

```bash
# Install PDF skill globally
openskills get anthropics/skills/pdf-editor

# Add to AGENTS.md
<available_skills>
<skill>
<name>pdf-editor</name>
<description>PDF manipulation capabilities</description>
</skill>
</available_skills>

# Agent loads when needed
Bash("openskills load pdf-editor")
```

### Workflow 2: Multi-Skill Project

```bash
# Install multiple skills to project
openskills get anthropics/skills/pdf-editor --target .agent/skills
openskills get anthropics/skills/canvas-design --target .agent/skills
openskills get community/testing-utils --target .agent/skills

# List project skills
openskills list
```

### Workflow 3: Custom Domain Skills

```bash
# Install company-specific skills
openskills get your-company/domain-skills --target .agent/skills

# Agents load domain knowledge on-demand
```

## Troubleshooting

**Skill not found:**
```bash
# Check all search paths
openskills list

# Verify installation
ls ~/.openskills/
ls .agent/skills/
ls .claude/skills/
```

**Git clone fails:**
```bash
# Verify repository is public
# Check repository URL is correct
# Test: git clone <url> manually
```

**Permission denied:**
```bash
# Ensure CLI is executable
chmod +x $(which openskills)

# Or reinstall
npm unlink openskills
cd /path/to/openskills
npm link
```
