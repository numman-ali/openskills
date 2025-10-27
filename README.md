# OpenSkills

[![npm version](https://img.shields.io/npm/v/openskills.svg)](https://www.npmjs.com/package/openskills)
[![npm downloads](https://img.shields.io/npm/dm/openskills.svg)](https://www.npmjs.com/package/openskills)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Universal skills loader for AI coding agents.

```bash
npm i -g openskills
openskills install anthropics/skills --project
openskills sync
```

> **Found this useful?** Follow [@nummanthinks](https://x.com/nummanthinks) for more AI tooling!

**Works with:** Claude Code, Cursor, Windsurf, Aider

---

## Quick Start

### 1. Install OpenSkills

```bash
npm i -g openskills
```

### 2. Install Skills

```bash
# Interactive selection (recommended)
openskills install anthropics/skills --project

# Or use Claude Code native
/plugin install document-skills@anthropic-agent-skills
```

### 3. Sync to AGENTS.md

```bash
openskills sync
```

**Done!** Skills are now available in your AI agent.

---

## Commands

```bash
openskills install <source> [--project] [-y]  # Install skills from GitHub
openskills sync [-y]                          # Update AGENTS.md (interactive)
openskills list                               # Show installed skills
openskills read <name>                        # Read skill (for AI agents)
openskills manage                             # Remove skills (interactive)
openskills remove <name>                      # Remove one skill
```

**Flags:**
- `--project` - Install to project `.claude/skills/` (recommended, conflict-free)
- `-y` - Skip interactive prompts (for scripts/CI)

---

## What Are Skills?

Skills are Anthropic's format for giving AI agents specialized capabilities:

- **Progressive disclosure** - Load instructions only when needed
- **Bundled resources** - Scripts, references, templates included
- **Universal format** - Works across all AI coding agents

**Example skills:**
- `pdf` - PDF manipulation (extract, merge, split)
- `docx` - Document creation and editing
- `canvas-design` - Visual design and posters
- `mcp-builder` - Build MCP servers

Browse: [Anthropic's Skills Repository](https://github.com/anthropics/skills)

---

## Why OpenSkills?

**Claude Code users:** Install skills from any GitHub repo, not just marketplaces

**Other agents (Cursor, Windsurf, Aider):** Use Anthropic skills format universally

**Key benefits:**
- ✅ Interactive selection (checkbox for skills and sync)
- ✅ Smart sync (pre-selects current AGENTS.md state)
- ✅ Claude Code compatible (coexists with plugins)
- ✅ Beautiful UX (colors, spinners, conflict warnings)

---

## Creating Your Own Skills

**Minimal skill structure:**

```
my-skill/
└── SKILL.md
    ---
    name: my-skill
    description: What this does and when to use it
    ---

    # Instructions in imperative form
```

Publish to GitHub → users install with:
```bash
openskills install your-username/my-skill --project
```

**Use Anthropic's skill-creator:**
```bash
openskills read skill-creator  # Detailed authoring guide
```

---

## How It Works

OpenSkills implements Claude Code's skills system identically, but uses CLI instead of tools.

**Want to understand exactly how it works?** Read [How It Works](docs/how-it-works.md) — detailed explanation of Claude Code's skills system and how OpenSkills replicates it universally.

---

## Requirements

- **Node.js** 18+
- **Git** (for cloning repositories)

---

## License

Apache 2.0

## Attribution

Implements [Anthropic's Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) specification.

**Not affiliated with Anthropic.** Claude, Claude Code, and Agent Skills are trademarks of Anthropic, PBC.
