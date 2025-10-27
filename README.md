# OpenSkills

[![npm version](https://img.shields.io/npm/v/openskills.svg)](https://www.npmjs.com/package/openskills)
[![npm downloads](https://img.shields.io/npm/dm/openskills.svg)](https://www.npmjs.com/package/openskills)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**The closest implementation matching Claude Code's skills system** — same prompt format, same marketplace, same folders, just using CLI instead of tools.

```bash
npm i -g openskills
openskills install anthropics/skills --project
openskills sync
```

> **Found this useful?** Follow [@nummanthinks](https://x.com/nummanthinks) for more AI tooling!

---

## What Is This?

OpenSkills brings **Anthropic's skills system** to all AI coding agents (Claude Code, Cursor, Windsurf, Aider).

**For Claude Code users:**
- Install skills from any GitHub repo, not just the marketplace
- Share skills across multiple agents
- Version control your skills in your repo

**For other agents (Cursor, Windsurf, Aider):**
- Get Claude Code's skills system universally
- Access Anthropic's marketplace skills via GitHub
- Use progressive disclosure (load skills on demand)

---

## How It Matches Claude Code Exactly

OpenSkills replicates Claude Code's skills system with **100% compatibility**:

✅ **Same prompt format** — `<available_skills>` XML with skill tags
✅ **Same marketplace** — Install from [anthropics/skills](https://github.com/anthropics/skills)
✅ **Same folders** — Uses `.claude/skills/` (project) and `~/.openskills/skills/` (global)
✅ **Same SKILL.md format** — YAML frontmatter + markdown instructions
✅ **Same progressive disclosure** — Load skills on demand, not upfront

**Only difference:** Claude Code uses `Skill` tool, OpenSkills uses `openskills read <name>` CLI command.

---

## Quick Start

### 1. Install

```bash
npm i -g openskills
```

### 2. Install Skills

```bash
# Install from Anthropic's marketplace (interactive selection)
openskills install anthropics/skills --project

# Or install from any GitHub repo
openskills install your-org/custom-skills --project
```

### 3. Sync to AGENTS.md

```bash
openskills sync
```

Done! Your agent now has skills with the same `<available_skills>` format as Claude Code.

---

## How It Works (Technical Deep Dive)

### Claude Code's Skills System

When you use Claude Code with skills installed, Claude's system prompt includes:

```xml
<skills_instructions>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively.

How to use skills:
- Invoke skills using this tool with the skill name only (no arguments)
- When you invoke a skill, you will see <command-message>The "{name}" skill is loading</command-message>
- The skill's prompt will expand and provide detailed instructions

Important:
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already running
</skills_instructions>

<available_skills>
<skill>
<name>pdf</name>
<description>Comprehensive PDF manipulation toolkit for extracting text and tables, creating new PDFs, merging/splitting documents, and handling forms...</description>
<location>plugin</location>
</skill>

<skill>
<name>xlsx</name>
<description>Comprehensive spreadsheet creation, editing, and analysis with support for formulas, formatting, data analysis...</description>
<location>plugin</location>
</skill>
</available_skills>
```

**How Claude uses it:**
1. User asks: "Extract data from this PDF"
2. Claude scans `<available_skills>` → finds "pdf" skill
3. Claude invokes: `Skill("pdf")`
4. SKILL.md content loads with detailed instructions
5. Claude follows instructions to complete task

### OpenSkills' System (Identical Format)

OpenSkills generates the **exact same** `<available_skills>` XML in your AGENTS.md:

```xml
<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively.

How to use skills:
- Invoke: Bash("openskills read <skill-name>")
- The skill content will load with detailed instructions
- Base directory provided in output for resolving bundled resources

Usage notes:
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already loaded in your context
</usage>

<available_skills>

<skill>
<name>pdf</name>
<description>Comprehensive PDF manipulation toolkit for extracting text and tables, creating new PDFs, merging/splitting documents, and handling forms...</description>
<location>project</location>
</skill>

<skill>
<name>xlsx</name>
<description>Comprehensive spreadsheet creation, editing, and analysis with support for formulas, formatting, data analysis...</description>
<location>project</location>
</skill>

</available_skills>
<!-- SKILLS_TABLE_END -->

</skills_system>
```

**How agents use it:**
1. User asks: "Extract data from this PDF"
2. Agent scans `<available_skills>` → finds "pdf" skill
3. Agent invokes: `Bash("openskills read pdf")`
4. SKILL.md content is output to agent's context
5. Agent follows instructions to complete task

### Side-by-Side Comparison

| Aspect | Claude Code | OpenSkills |
|--------|-------------|------------|
| **System Prompt** | Built into Claude Code | In AGENTS.md |
| **Invocation** | `Skill("pdf")` tool | `openskills read pdf` CLI |
| **Prompt Format** | `<available_skills>` XML | `<available_skills>` XML (identical) |
| **Folder Structure** | `.claude/skills/` | `.claude/skills/` (identical) |
| **SKILL.md Format** | YAML + markdown | YAML + markdown (identical) |
| **Progressive Disclosure** | Yes | Yes |
| **Bundled Resources** | `references/`, `scripts/`, `assets/` | `references/`, `scripts/`, `assets/` (identical) |
| **Marketplace** | Anthropic marketplace | GitHub (anthropics/skills) |

**Everything is identical except the invocation method.**

### The SKILL.md Format

Both use the exact same format:

```markdown
---
name: pdf
description: Comprehensive PDF manipulation toolkit for extracting text and tables, creating new PDFs, merging/splitting documents, and handling forms.
---

# PDF Skill Instructions

When the user asks you to work with PDFs, follow these steps:

1. Install dependencies: `pip install pypdf2`
2. Extract text using the extract_text.py script in scripts/
3. For bundled resources, use the base directory provided in the skill output
4. ...

[Detailed instructions that Claude/agent follows]
```

**Progressive disclosure:** The full instructions load only when the skill is invoked, keeping your agent's context clean.

---

## Why CLI Instead of MCP?

**MCP (Model Context Protocol)** is Anthropic's protocol for connecting AI to external tools and data sources. It's great for:
- Database connections
- API integrations
- Real-time data fetching
- External service integration

**Skills (SKILL.md format)** are different — they're for:
- Specialized workflows (PDF manipulation, spreadsheet editing)
- Bundled resources (scripts, templates, references)
- Progressive disclosure (load instructions only when needed)
- Static, reusable patterns

**Why not implement skills via MCP?**

1. **Skills are static instructions, not dynamic tools**
   MCP is for server-client connections. Skills are markdown files with instructions.

2. **No server needed**
   Skills are just files. MCP requires running servers.

3. **Universal compatibility**
   CLI works with any agent (Claude Code, Cursor, Windsurf, Aider). MCP requires MCP support.

4. **Follows Anthropic's design**
   Anthropic created skills as SKILL.md files, not MCP servers. We're implementing their spec.

5. **Simpler for users**
   `openskills install anthropics/skills --project` vs "configure MCP server, set up authentication, manage server lifecycle"

**MCP and skills solve different problems.** OpenSkills implements Anthropic's skills spec (SKILL.md format) the way it was designed — as progressively-loaded markdown instructions.

---

## Claude Code Compatibility

You can use **both** Claude Code plugins and OpenSkills project skills together:

**In your `<available_skills>` list:**
```xml
<skill>
<name>pdf</name>
<description>...</description>
<location>plugin</location>  <!-- Claude Code marketplace -->
</skill>

<skill>
<name>custom-skill</name>
<description>...</description>
<location>project</location>  <!-- OpenSkills from GitHub -->
</skill>
```

They coexist perfectly. Claude invokes marketplace plugins via `Skill` tool, OpenSkills skills via CLI. No conflicts.

---

## Commands

```bash
openskills install <source> [--project] [-y]  # Install from GitHub (interactive)
openskills sync [-y]                          # Update AGENTS.md (interactive)
openskills list                               # Show installed skills
openskills read <name>                        # Load skill (for agents)
openskills manage                             # Remove skills (interactive)
openskills remove <name>                      # Remove specific skill
```

### Flags

- `--project` — Install to `.claude/skills/` (recommended, gitignored, project-specific)
- `-y` — Skip interactive selection (for scripts/CI)

### Interactive by Default

All commands use beautiful TUI by default:

**Install:**
```bash
openskills install anthropics/skills --project
# → Checkbox to select which skills to install
# → Shows skill name, description, size
# → All checked by default
```

**Sync:**
```bash
openskills sync
# → Checkbox to select which skills to include in AGENTS.md
# → Pre-selects skills already in AGENTS.md
# → Empty selection removes skills section
```

**Manage:**
```bash
openskills manage
# → Checkbox to select which skills to remove
# → Nothing checked by default (safe)
```

---

## Example Skills

From Anthropic's [skills repository](https://github.com/anthropics/skills):

- **xlsx** — Spreadsheet creation, editing, formulas, data analysis
- **docx** — Document creation with tracked changes and comments
- **pdf** — PDF manipulation (extract, merge, split, forms)
- **pptx** — Presentation creation and editing
- **canvas-design** — Create posters and visual designs
- **mcp-builder** — Build Model Context Protocol servers
- **skill-creator** — Detailed guide for authoring skills

Browse all: [github.com/anthropics/skills](https://github.com/anthropics/skills)

---

## Creating Your Own Skills

### Minimal Structure

```
my-skill/
└── SKILL.md
    ---
    name: my-skill
    description: What this does and when to use it
    ---

    # Instructions in imperative form

    When the user asks you to X, do Y...
```

### With Bundled Resources

```
my-skill/
├── SKILL.md
├── references/
│   └── api-docs.md      # Supporting documentation
├── scripts/
│   └── process.py       # Helper scripts
└── assets/
    └── template.json    # Templates, configs
```

In your SKILL.md, reference resources:
```markdown
1. Read the API documentation in references/api-docs.md
2. Run the process.py script from scripts/
3. Use the template from assets/template.json
```

The agent sees the base directory when loading the skill:
```
Loading: my-skill
Base directory: /path/to/.claude/skills/my-skill

[SKILL.md content]
```

### Publishing

1. Push to GitHub: `your-username/my-skill`
2. Users install with: `openskills install your-username/my-skill --project`

### Authoring Guide

Use Anthropic's skill-creator for detailed guidance:

```bash
openskills install anthropics/skills --project
openskills read skill-creator
```

This loads comprehensive instructions on:
- Writing effective skill descriptions
- Structuring instructions for agents
- Using bundled resources
- Testing and iteration

---

## Requirements

- **Node.js** 20.6+ (for ora dependency)
- **Git** (for cloning repositories)

---

## License

Apache 2.0

## Attribution

Implements [Anthropic's Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) specification.

**Not affiliated with Anthropic.** Claude, Claude Code, and Agent Skills are trademarks of Anthropic, PBC.
