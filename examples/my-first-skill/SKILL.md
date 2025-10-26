---
name: my-first-skill
description: Example skill demonstrating Anthropic SKILL.md format. Load when learning to create skills or testing the OpenSkills loader.
---

# My First Skill

This is an example skill demonstrating the Anthropic SKILL.md format.

## Purpose

This skill shows how to structure procedural guidance for AI coding agents using progressive disclosure.

## When to Use

Load this skill when:
- Learning how skills work
- Testing the OpenSkills loader
- Understanding the SKILL.md format

## Instructions

To create a skill:

1. Create a directory: `mkdir my-skill/`
2. Add SKILL.md with YAML frontmatter:
   ```yaml
   ---
   name: my-skill
   description: When to use this skill
   ---
   ```
3. Write instructions in imperative form (not second person)
4. Reference bundled resources as needed

## Bundled Resources

For detailed information about the SKILL.md specification:

See `references/skill-format.md`

## Best Practices

- Write in imperative/infinitive form: "To do X, execute Y"
- NOT second person: avoid "You should..."
- Keep SKILL.md under 5,000 words
- Move detailed content to references/
- Use scripts/ for executable code
- Use assets/ for templates and output files

## Resource Resolution

When this skill is loaded, the base directory is provided:

```
Base directory: /path/to/my-first-skill
```

Relative paths resolve from base directory:
- `references/skill-format.md` → `/path/to/my-first-skill/references/skill-format.md`
- `scripts/helper.sh` → `/path/to/my-first-skill/scripts/helper.sh`
