# SKILL.md Format Reference

## YAML Frontmatter (Required)

Every SKILL.md must start with YAML frontmatter:

```yaml
---
name: skill-name           # Required: hyphen-case identifier
description: When to use   # Required: 1-2 sentences, third-person
---
```

## Markdown Body (Required)

After frontmatter, write instructions in **imperative/infinitive form**:

**Good:**
- "To accomplish X, execute Y"
- "Load this skill when Z"
- "See references/guide.md for details"

**Avoid:**
- "You should do X"
- "If you need Y"
- "When you want Z"

## Progressive Disclosure

Skills load in three levels:

1. **Metadata** (always in context): name + description
2. **SKILL.md** (loaded when relevant): core instructions
3. **Resources** (loaded as needed): detailed documentation

## Bundled Resources (Optional)

### references/

Documentation loaded into context as needed:
- API documentation
- Database schemas
- Detailed guides

### scripts/

Executable code (Python/Bash/etc.):
- Can be run without loading to context
- Use for deterministic, repeatable tasks

### assets/

Files used in output (not loaded to context):
- Templates
- Images
- Boilerplate code

## File Size Guidelines

- **SKILL.md**: Under 5,000 words
- **references/**: Unlimited (loaded selectively)
- **scripts/**: Executable, not counted
- **assets/**: Not loaded to context

## Example Structure

```
pdf-editor/
├── SKILL.md              (~2,000 words)
├── references/
│   └── pdf-api.md        (detailed API docs)
├── scripts/
│   ├── rotate.py         (executable)
│   └── merge.py
└── assets/
    └── template.pdf      (boilerplate)
```
