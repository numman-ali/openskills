# Release Checklist

Use this when shipping a new OpenSkills version so we do not repeat the same guidance every time.

## 1) Scope + Approval
- Confirm the release type (patch/minor/major) and get approval for public actions.
- Verify the change list and whether any docs or messages need updates.

## 2) Versioning + Changelog
- Bump `package.json` + `package-lock.json` (use `npm version X.Y.Z --no-git-tag-version`).
- Update `CHANGELOG.md` with date + bullet list.

## 3) Build + Tests
- Run `npm run build`.
- Run `npm test` (or `npm run prepublishOnly`).

## 4) Commit + Push
- Stage only release-related files.
- Commit message: `Release vX.Y.Z`.
- Push branch.

## 5) Release + Publish
- Tag: `git tag vX.Y.Z` then `git push origin vX.Y.Z`.
- GitHub release notes from `CHANGELOG.md`.
- Publish to npm: `npm publish`.

## 6) Post-Release
- Close related issues/PRs with confirmation.
- Update `.github/maintainer/decisions.md` and any relevant notes.
