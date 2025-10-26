# Creating Skills

Guide for authoring effective skills using Anthropic's SKILL.md format.

## Skill Structure

```
skill-name/
├── SKILL.md                    (required)
│   ├── YAML frontmatter
│   │   ├── name: skill-name
│   │   └── description: When to use
│   └── Markdown instructions
└── Resources (optional)
    ├── references/         Documentation loaded as needed
    ├── scripts/            Executable code
    └── assets/             Templates and output files
```

## YAML Frontmatter (Required)

Every SKILL.md must start with:

```yaml
---
name: skill-name           # hyphen-case identifier
description: What this skill does and when to use it. Be specific about triggers.
---
```

**Name:** Use hyphen-case (e.g., `pdf-editor`, not `PDF Editor` or `pdf_editor`)

**Description:** Be specific about when agents should load this skill:
- Good: "PDF manipulation and editing. Load when rotating, merging, or extracting PDF pages."
- Avoid: "Helps with PDFs" (too vague)

## Writing Style

Use **imperative/infinitive form** (verb-first), not second person:

**Good:**
```markdown
To rotate a PDF:
1. Load the PDF file
2. Execute the rotation script
3. Save the output
```

**Avoid:**
```markdown
You should load the PDF file first.
Then you can rotate it.
```

## Bundled Resources

### When to Use references/

Add reference files for documentation that should be loaded into context as needed:

**Use cases:**
- API documentation
- Database schemas
- Domain knowledge
- Detailed workflow guides

**Example:**
```markdown
For comprehensive API documentation: See `references/api-docs.md`
```

### When to Use scripts/

Add scripts for code that agents repeatedly rewrite or need deterministic execution:

**Use cases:**
- PDF manipulation (rotate, merge, split)
- Image processing
- Data transformations
- File format conversions

**Example:**
```markdown
To rotate a PDF, execute:

`scripts/rotate-pdf.py input.pdf 90 output.pdf`
```

### When to Use assets/

Add files that appear in the output, not loaded to context:

**Use cases:**
- HTML/React boilerplate
- Template documents
- Brand assets (logos, fonts)
- Configuration templates

**Example:**
```markdown
To create a new frontend app, copy:

`assets/frontend-template/` → new project directory
```

## Progressive Disclosure Guidelines

**Keep SKILL.md lean** (under 5,000 words):
- Core procedural instructions only
- Reference detailed docs in references/
- Link to scripts/ for executable code
- Mention assets/ for templates

**Move to references/ if:**
- Content exceeds 10,000 words
- Detailed API documentation
- Comprehensive schemas
- Not always needed

## Testing Your Skill

1. Create the skill directory and SKILL.md
2. Install locally: `cp -r my-skill ~/.openskills/`
3. Test loading: `load-skill my-skill`
4. Verify base directory shows in output
5. Test references load correctly

## Publishing Your Skill

### GitHub Repository

```bash
# Create repo
git init
git add .
git commit -m "Initial skill"
gh repo create my-skill --public --source=.
git push -u origin main
```

### Allow Installation

Users can install via:
```bash
install-skill your-username/my-skill
```

### Marketplace (Optional)

To create a marketplace with multiple skills:

1. Create `.claude-plugin/marketplace.json`
2. List skills in `plugins` array
3. Users add marketplace: `/plugin marketplace add owner/repo`

## Best Practices

1. **Be specific in description** - Help agents know when to load
2. **Use imperative form** - "To do X, execute Y"
3. **Keep core lean** - Move details to references/
4. **Validate YAML** - Ensure frontmatter parses correctly
5. **Test universally** - Try in multiple agents (Claude Code, Cursor, etc.)

## Examples

See Anthropic's skills for reference:
- [anthropics/skills](https://github.com/anthropics/skills)
- Example skills: pdf-editor, canvas-design, mcp-builder

See OpenSkills examples:
- [examples/my-first-skill](../examples/my-first-skill/) - Minimal template
