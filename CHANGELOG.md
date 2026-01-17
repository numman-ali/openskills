# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2026-01-17

### Added

- **`openskills update`** - Refresh installed skills from their recorded source (default: all)
- **Source metadata tracking** - Install now records origin info for reliable updates

### Changed

- **Multi-skill read** - `openskills read` supports comma-separated names
- **Generated usage text** - Clarified read invocation for shell usage
- **README** - Added update guidance and human usage tips

### Fixed

- **Update UX** - Skips skills without source metadata and lists them for re-install

## [1.3.0] - 2025-12-14

### Added

- **Symlink support** - Skills can now be symlinked into the skills directory ([#3](https://github.com/numman-ali/openskills/issues/3))
  - Enables git-based skill updates by symlinking from a cloned repo
  - Supports local skill development workflows
  - Broken symlinks are gracefully skipped

- **Configurable output path** - New `--output` / `-o` flag for sync command ([#5](https://github.com/numman-ali/openskills/issues/5))
  - Sync to any `.md` file (e.g., `.ruler/AGENTS.md`)
  - Auto-creates file with heading if it doesn't exist
  - Auto-creates nested directories if needed

- **Local path installation** - Install skills from local directories ([#10](https://github.com/numman-ali/openskills/issues/10))
  - Supports absolute paths (`/path/to/skill`)
  - Supports relative paths (`./skill`, `../skill`)
  - Supports tilde expansion (`~/my-skills/skill`)

- **Private git repo support** - Install from private repositories ([#10](https://github.com/numman-ali/openskills/issues/10))
  - SSH URLs (`git@github.com:org/private-skills.git`)
  - HTTPS with authentication
  - Uses system SSH keys automatically

- **Comprehensive test suite** - 88 tests across 6 test files
  - Unit tests for symlink detection, YAML parsing
  - Integration tests for install, sync commands
  - E2E tests for full CLI workflows

### Changed

- **`--yes` flag now skips all prompts** - Fully non-interactive mode for CI/CD ([#6](https://github.com/numman-ali/openskills/issues/6))
  - Overwrites existing skills without prompting
  - Shows `Overwriting: <skill-name>` message when skipping prompt
  - All commands now work in headless environments

- **CI workflow reordered** - Build step now runs before tests
  - Ensures `dist/cli.js` exists for E2E tests

### Security

- **Path traversal protection** - Validates installation paths stay within target directory
- **Symlink dereference** - `cpSync` uses `dereference: true` to safely copy symlink targets
- **Non-greedy YAML regex** - Prevents potential ReDoS in frontmatter parsing

## [1.3.1] - 2026-01-17

### Fixed

- **Windows installs** - Path validation now works on Windows (`Security error: Installation path outside target directory`)
- **CLI version** - `npx openskills --version` reads from package.json
- **Root SKILL.md** - Single-skill repos with SKILL.md in repo root now install correctly

## [1.4.0] - 2026-01-17

### Changed

- **README** - Clarify project-local default installs and remove redundant sync note
- **Installer messages** - Call out project-local default vs `--global` explicitly

## [1.3.2] - 2026-01-17

### Changed

- **Docs & AGENTS.md guidance** - Use `npx openskills` for all command examples and generated usage text

## [1.2.1] - 2025-10-27

### Fixed

- README documentation cleanup - removed duplicate sections and incorrect flags

## [1.2.0] - 2025-10-27

### Added

- `--universal` flag to install skills to `.agent/skills/` instead of `.claude/skills/`
  - For multi-agent setups (Claude Code + Cursor/Windsurf/Aider)
  - Avoids conflicts with Claude Code's native marketplace plugins

### Changed

- Project install is now the default (was global)
- Skills install to `./.claude/skills/` by default

## [1.1.0] - 2025-10-27

### Added

- Comprehensive single-page README with technical deep dive
- Side-by-side comparison with Claude Code

### Fixed

- Location tag now correctly shows `project` or `global` based on install location

## [1.0.0] - 2025-10-26

### Added

- Initial release
- `npx openskills install <source>` - Install skills from GitHub repos
- `npx openskills sync` - Generate `<available_skills>` XML for AGENTS.md
- `npx openskills list` - Show installed skills
- `npx openskills read <name>` - Load skill content for agents
- `npx openskills manage` - Interactive skill removal
- `npx openskills remove <name>` - Remove specific skill
- Interactive TUI for all commands
- Support for Anthropic's SKILL.md format
- Progressive disclosure (load skills on demand)
- Bundled resources support (references/, scripts/, assets/)

[1.3.0]: https://github.com/numman-ali/openskills/compare/v1.2.1...v1.3.0
[1.3.1]: https://github.com/numman-ali/openskills/compare/v1.3.0...v1.3.1
[1.3.2]: https://github.com/numman-ali/openskills/compare/v1.3.1...v1.3.2
[1.4.0]: https://github.com/numman-ali/openskills/compare/v1.3.2...v1.4.0
[1.5.0]: https://github.com/numman-ali/openskills/compare/v1.4.0...v1.5.0
[1.2.1]: https://github.com/numman-ali/openskills/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/numman-ali/openskills/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/numman-ali/openskills/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/numman-ali/openskills/releases/tag/v1.0.0
