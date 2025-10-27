# How OpenSkills Works — Claude Code Skills System Explained

## TL;DR

OpenSkills works **EXACTLY** like Claude Code's built-in skills system, but:
- **Claude Code:** Uses `Skill` tool to load skills
- **OpenSkills:** Uses `openskills read <skill-name>` CLI command to load skills

Everything else is identical: folder structure, SKILL.md format, progressive disclosure, and marketplace compatibility.

---

## Claude Code's Skills System (How It Actually Works)

### 1. The System Prompt

When you use Claude Code with skills installed, your system prompt includes this section:

```xml
<skills_instructions>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:
- Invoke skills using this tool with the skill name only (no arguments)
- When you invoke a skill, you will see <command-message>The "{name}" skill is loading</command-message>
- The skill's prompt will expand and provide detailed instructions on how to complete the task
- Examples:
  - `command: "pdf"` - invoke the pdf skill
  - `command: "xlsx"` - invoke the xlsx skill
  - `command: "ms-office-suite:pdf"` - invoke using fully qualified name

Important:
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already running
- Do not use this tool for built-in CLI commands (like /help, /clear, etc.)
</skills_instructions>

<available_skills>
<skill>
<name>
xlsx
</name>
<description>
Comprehensive spreadsheet creation, editing, and analysis with support for formulas, formatting, data analysis, and visualization. When Claude needs to work with spreadsheets (.xlsx, .xlsm, .csv, .tsv, etc) for: (1) Creating new spreadsheets with formulas and formatting, (2) Reading or analyzing data, (3) Modify existing spreadsheets while preserving formulas, (4) Data analysis and visualization in spreadsheets, or (5) Recalculating formulas (plugin:document-skills@anthropic-agent-skills)
</description>
<location>
plugin
</location>
</skill>

<skill>
<name>
pdf
</name>
<description>
Comprehensive PDF manipulation toolkit for extracting text and tables, creating new PDFs, merging/splitting documents, and handling forms. When Claude needs to fill in a PDF form or programmatically process, generate, or analyze PDF documents at scale. (plugin:document-skills@anthropic-agent-skills)
</description>
<location>
plugin
</location>
</skill>

<!-- ... more skills ... -->
</available_skills>
```

### 2. How Claude Uses Skills

When a user asks Claude to do something:

1. **Check Available Skills:** Claude scans the `<available_skills>` list to see if any skill matches the task
2. **Invoke Skill:** If a match is found, Claude calls the `Skill` tool with the skill name
3. **Load Instructions:** The skill's SKILL.md content loads into Claude's context
4. **Execute Task:** Claude follows the detailed instructions from the SKILL.md file

**Example interaction:**

```
User: "Can you extract data from this PDF?"

Claude: [Checks <available_skills>]
Claude: [Sees "pdf" skill description mentions PDF manipulation]
Claude: [Calls Skill tool with command: "pdf"]
Claude: [SKILL.md content loads with detailed PDF extraction instructions]
Claude: [Follows instructions to complete the task]
```

### 3. The Folder Structure

Claude Code stores skills in:

```
.claude/
└── skills/
    ├── pdf/
    │   ├── SKILL.md          # Main skill instructions
    │   ├── references/       # Supporting docs
    │   ├── scripts/          # Helper scripts
    │   └── assets/           # Images, templates
    └── xlsx/
        └── SKILL.md
```

### 4. The SKILL.md Format

Each skill is a markdown file with YAML frontmatter:

```markdown
---
name: pdf
description: Comprehensive PDF manipulation toolkit for extracting text and tables, creating new PDFs, merging/splitting documents, and handling forms. When Claude needs to fill in a PDF form or programmatically process, generate, or analyze PDF documents at scale.
---

# PDF Skill Instructions

When the user asks you to work with PDFs, follow these steps:

1. Install dependencies: `pip install pypdf2`
2. Extract text using the extract_text.py script in scripts/
3. ...

[Detailed instructions here - this is what Claude sees when skill loads]
```

---

## OpenSkills (Identical System, CLI-Based)

### 1. The OpenSkills Prompt

When you use OpenSkills with any coding agent (Claude Code, Cursor, Windsurf, Aider), your AGENTS.md file includes:

```xml
<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:
- Invoke: Bash("openskills read <skill-name>")
- The skill content will load with detailed instructions on how to complete the task
- Base directory provided in output for resolving bundled resources (references/, scripts/, assets/)

Usage notes:
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already loaded in your context
- Each skill invocation is stateless
</usage>

<available_skills>

<skill>
<name>pdf</name>
<description>Comprehensive PDF manipulation toolkit for extracting text and tables, creating new PDFs, merging/splitting documents, and handling forms. When Claude needs to fill in a PDF form or programmatically process, generate, or analyze PDF documents at scale. (project, gitignored)</description>
<location>project</location>
</skill>

<skill>
<name>xlsx</name>
<description>Comprehensive spreadsheet creation, editing, and analysis with support for formulas, formatting, data analysis, and visualization. When Claude needs to work with spreadsheets (.xlsx, .xlsm, .csv, .tsv, etc) for: (1) Creating new spreadsheets with formulas and formatting, (2) Reading or analyzing data, (3) Modify existing spreadsheets while preserving formulas, (4) Data analysis and visualization in spreadsheets, or (5) Recalculating formulas (project, gitignored)</description>
<location>project</location>
</skill>

<!-- ... more skills ... -->

</available_skills>
<!-- SKILLS_TABLE_END -->

</skills_system>
```

### 2. How Agents Use OpenSkills

When a user asks the agent to do something:

1. **Check Available Skills:** Agent scans the `<available_skills>` list to see if any skill matches the task
2. **Invoke Skill:** If a match is found, agent runs `openskills read <skill-name>`
3. **Load Instructions:** The skill's SKILL.md content is output to the agent's context
4. **Execute Task:** Agent follows the detailed instructions from the SKILL.md file

**Example interaction:**

```
User: "Can you extract data from this PDF?"

Agent: [Checks <available_skills> in AGENTS.md]
Agent: [Sees "pdf" skill description mentions PDF manipulation]
Agent: [Runs: openskills read pdf]
Agent: [SKILL.md content loads via stdout]
Agent: [Follows instructions to complete the task]
```

### 3. The Folder Structure (Identical)

OpenSkills uses the **exact same folder structure** as Claude Code:

```
.claude/
└── skills/
    ├── pdf/
    │   ├── SKILL.md          # Main skill instructions
    │   ├── references/       # Supporting docs
    │   ├── scripts/          # Helper scripts
    │   └── assets/           # Images, templates
    └── xlsx/
        └── SKILL.md
```

Why? **Maximum compatibility.** If you switch between Claude Code and other agents, your skills work identically.

### 4. The SKILL.md Format (Identical)

OpenSkills uses the **exact same SKILL.md format** as Claude Code:

```markdown
---
name: pdf
description: Comprehensive PDF manipulation toolkit for extracting text and tables, creating new PDFs, merging/splitting documents, and handling forms. When Claude needs to fill in a PDF form or programmatically process, generate, or analyze PDF documents at scale.
---

# PDF Skill Instructions

When the user asks you to work with PDFs, follow these steps:

1. Install dependencies: `pip install pypdf2`
2. Extract text using the extract_text.py script in scripts/
3. ...

[Same detailed instructions as Claude Code version]
```

---

## Side-by-Side Comparison

| Aspect | Claude Code | OpenSkills |
|--------|-------------|------------|
| **System Prompt** | `<available_skills>` in Claude Code's system instructions | `<available_skills>` in AGENTS.md |
| **Invocation** | `Skill` tool (e.g., `command: "pdf"`) | `openskills read pdf` CLI command |
| **Folder Structure** | `.claude/skills/` | `.claude/skills/` (identical) |
| **SKILL.md Format** | YAML frontmatter + markdown instructions | YAML frontmatter + markdown instructions (identical) |
| **Progressive Disclosure** | Yes (loads on demand) | Yes (loads on demand) |
| **Bundled Resources** | Yes (`references/`, `scripts/`, `assets/`) | Yes (`references/`, `scripts/`, `assets/`) |
| **Marketplace Compatibility** | Yes (install from Anthropic marketplace) | Yes (install from any GitHub repo, including anthropics/skills) |
| **Agent Support** | Claude Code only | Claude Code, Cursor, Windsurf, Aider, any agent with CLI |

---

## Key Difference: Tool vs CLI

**Claude Code:**
```
Claude invokes skills via Skill tool:
Skill("pdf") → loads SKILL.md content
```

**OpenSkills:**
```
Agent invokes skills via CLI:
Bash("openskills read pdf") → outputs SKILL.md content
```

**Everything else is identical.** The agent sees the same instructions, the same folder structure, the same resources. OpenSkills is not a "fork" or "alternative" — it's **Claude Code's skills system made universal via CLI**.

---

## Marketplace Compatibility

### Claude Code Marketplace

Claude Code has an official marketplace (`@anthropic-agent-skills`). When you install a plugin:

```bash
/plugin install document-skills@anthropic-agent-skills
```

This installs to a special plugin location. Claude Code loads these via the `Skill` tool with `location: plugin`.

### OpenSkills + GitHub

OpenSkills can install the **exact same skills** from Anthropic's GitHub repository:

```bash
openskills install anthropics/skills --project
```

This installs to `.claude/skills/` (project location). The agent loads these via `openskills read <skill-name>`.

**Compatibility:** You can have both Claude Code plugins AND OpenSkills project skills installed simultaneously. They coexist perfectly because:
- Claude Code plugins → loaded via `Skill` tool
- OpenSkills skills → loaded via `openskills read` CLI
- Both use the same SKILL.md format
- Both use progressive disclosure (load on demand)

### Installing from Any GitHub Repo

OpenSkills supports any GitHub repository with SKILL.md files:

```bash
# Anthropic's official skills
openskills install anthropics/skills --project

# Your company's internal skills
openskills install mycompany/custom-skills --project

# Community skills
openskills install numman-ali/openskills-community --project

# Any GitHub URL with SKILL.md files
openskills install https://github.com/username/repo --project
```

---

## Why This Matters

### For Claude Code Users

OpenSkills lets you:
- **Install from any GitHub repo** (not just marketplace)
- **Share skills across agents** (if you use Cursor, Windsurf, etc.)
- **Version control skills** (commit `.claude/skills/` to your repo)

You can use Claude Code plugins AND OpenSkills project skills together.

### For Other Agent Users (Cursor, Windsurf, Aider)

OpenSkills brings you:
- **Anthropic's skills system** (progressive disclosure, SKILL.md format)
- **Access to Anthropic's skills** (install from anthropics/skills repo)
- **Universal format** (works across all agents with CLI support)

Your agent sees the exact same `<available_skills>` format that Claude Code uses.

---

## How to Get Started

### 1. Install OpenSkills

```bash
npm i -g openskills
```

### 2. Install Skills

```bash
# Install from Anthropic's skills repository
openskills install anthropics/skills --project

# Interactive selection (default)
# → Checkbox to select which skills to install
# → Skills go to .claude/skills/ (project, gitignored)
```

### 3. Sync to AGENTS.md

```bash
openskills sync

# Interactive selection (default)
# → Checkbox to select which skills to include
# → Pre-selects skills currently in AGENTS.md
# → Updates AGENTS.md with <available_skills> section
```

### 4. Use Skills with Your Agent

Your agent now sees:

```xml
<available_skills>
<skill>
<name>pdf</name>
<description>Comprehensive PDF manipulation toolkit...</description>
<location>project</location>
</skill>
</available_skills>
```

And invokes skills with:

```bash
openskills read pdf
```

Which outputs:

```
Loading: pdf
Base directory: /Users/you/project/.claude/skills/pdf

---
name: pdf
description: Comprehensive PDF manipulation toolkit...
---

# PDF Skill Instructions
[Full instructions here]
```

**Done!** Your agent now has access to specialized skills, loaded progressively on demand, exactly like Claude Code.

---

## Frequently Asked Questions

### Q: Is this a fork of Claude Code?

**No.** OpenSkills is a CLI tool that implements Anthropic's skills system specification (SKILL.md format, progressive disclosure, `<available_skills>` XML). Claude Code uses a tool to load skills; OpenSkills uses a CLI command. The underlying system is identical.

### Q: Can I use Claude Code plugins and OpenSkills together?

**Yes.** They coexist perfectly:
- Claude Code plugins → listed in `<available_skills>` with `location: plugin`
- OpenSkills skills → listed in `<available_skills>` with `location: project`
- Claude invokes plugins via `Skill` tool, OpenSkills skills via CLI
- No conflicts, no overwrites

### Q: Do I need Claude Code to use OpenSkills?

**No.** OpenSkills works with any coding agent that supports CLI commands (Cursor, Windsurf, Aider, etc.). It was designed to bring Anthropic's skills system to agents beyond Claude Code.

### Q: Are the skills the same as Claude Code marketplace skills?

**Yes.** If you install from `anthropics/skills` repo, you get the exact same SKILL.md files as the marketplace. The only difference is installation method (CLI vs marketplace UI).

### Q: Will my custom skills work with Claude Code?

**Yes.** If you follow the SKILL.md format, your skills work with both OpenSkills and Claude Code. Just make sure to place them in `.claude/skills/` for project skills or `~/.openskills/skills/` for global skills.

### Q: Can I install skills from private repos?

**Yes.** OpenSkills uses `git clone`, so any repo you have access to works:

```bash
openskills install git@github.com:mycompany/private-skills.git --project
```

### Q: What's the difference between --project and global install?

- **`--project` (recommended):** Installs to `.claude/skills/` in your current project. Gitignored by default. Project-specific skills.
- **Global (no flag):** Installs to `~/.openskills/skills/`. Available to all projects. For skills you use everywhere.

---

## Summary

OpenSkills **is** Claude Code's skills system, made universal via CLI:

1. **Same folder structure** (`.claude/skills/`)
2. **Same SKILL.md format** (YAML frontmatter + markdown instructions)
3. **Same progressive disclosure** (load on demand)
4. **Same `<available_skills>` XML** (agents parse identically)
5. **Different invocation** (CLI instead of tool)

If you understand how Claude Code skills work, you understand OpenSkills. The only difference is the invocation method — everything else is a 1:1 match.

**For Claude Code users:** OpenSkills adds GitHub installation and cross-agent sharing.

**For other agent users:** OpenSkills brings Anthropic's skills system to your agent.

Both benefit from **the same underlying architecture** — progressive disclosure, SKILL.md format, and marketplace compatibility.
