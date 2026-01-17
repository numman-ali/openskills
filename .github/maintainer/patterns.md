# Observed Patterns

## Recurring Issues

### Windows Path Handling
- **First seen:** 2025-12-15
- **Frequency:** 8 duplicate reports
- **Root cause:** Hardcoded `/` instead of `path.sep`
- **Resolution:** Fixed in v1.3.1
- **Prevention:** Added Windows CI

### Version Display Mismatch
- **First seen:** 2025-12-19
- **Cause:** Hardcoded version string not updated
- **Resolution:** Read from package.json dynamically

## Contributor Patterns

- Chinese-speaking user base is significant (consider i18n)
- Contributors often submit multiple PRs for same issue (need faster review)

## Codebase Patterns

- Most bugs cluster in `src/cli/` (needs refactoring)
- Test coverage gaps in error handling paths

