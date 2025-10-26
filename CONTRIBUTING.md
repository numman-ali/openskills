# Contributing to OpenSkills

Thank you for your interest in contributing to OpenSkills!

## Code Standards

- **TypeScript:** All code must be TypeScript with strict type checking
- **Testing:** Include tests for new functionality (we use vitest)
- **Documentation:** Update README.md for user-facing changes
- **Modular design:** Keep functions focused and under 50 lines
- **Minimal dependencies:** Avoid adding dependencies unless necessary

## Pull Request Process

1. **Fork the repository** and create a feature branch
2. **Write clear commit messages** explaining the "why" not just "what"
3. **Include tests** for new functionality
4. **Update documentation** (README.md, docs/)
5. **Ensure all checks pass** (typecheck, test, build)
6. **Submit PR** with clear description of changes

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/openskills
cd openskills

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Link locally for testing
npm link
openskills list
```

## Testing Changes

```bash
# Type check
npm run typecheck

# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Test CLI locally
npm link
openskills install anthropics/skills/pdf-editor --project
openskills sync
openskills read pdf-editor
```

## Project Structure

```
src/
├── cli.ts              # Main entry point
├── commands/           # Command implementations
├── utils/              # Shared utilities
└── types.ts            # TypeScript interfaces

tests/
└── utils/              # Unit tests
```

## Reporting Issues

When reporting issues, please:

- **Check existing issues** to avoid duplicates
- **Provide clear reproduction steps**
- **Include version information** (`openskills --version`, `node --version`)
- **Use issue templates** (bug report or feature request)

## Feature Requests

We welcome feature requests that:
- Improve usability for AI coding agents
- Enhance AGENTS.md integration
- Maintain compatibility with Anthropic's SKILL.md spec
- Work universally across agents (Claude Code, Cursor, Windsurf, Aider)

## Questions?

For questions about:
- **Usage:** Open a GitHub issue
- **Contributing:** Open a discussion thread
- **Anthropic Skills spec:** See [Anthropic's documentation](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.

---

Thank you for helping make OpenSkills better!
