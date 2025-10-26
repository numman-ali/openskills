# Security Policy

## Supported Versions

We provide security updates for the latest version.

| Version | Supported          |
| ------- | ------------------ |
| Latest  | ✅ Active support |
| < 1.0   | ❌ No longer supported |

## Security Considerations

### Git Credentials

OpenSkills clones repositories from GitHub. To protect your security:

✅ **What we do:**
- Use `git clone` with HTTPS (no credentials required for public repos)
- Clean up temporary directories after installation
- Only install from public repositories by default

⚠️ **What you should do:**
- Only install skills from trusted sources
- Review SKILL.md content before loading in AI agents
- Be cautious with skills that include executable scripts
- Verify repository ownership before installing

### Reporting a Vulnerability

If you discover a security vulnerability:

1. **DO NOT open a public issue**
2. Email: security@[check GitHub profile for contact]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We aim to respond to security reports within 48 hours.

### Responsible Disclosure

We follow responsible disclosure practices:
- Security issues are patched before public disclosure
- Reporter receives credit (unless anonymity is requested)
- Timeline for disclosure is coordinated with reporter

### Security Best Practices

When using OpenSkills:

- **Verify sources:** Only install skills from trusted repositories
- **Review content:** Check SKILL.md before loading in agents
- **Inspect scripts:** Review any executable scripts in skills/scripts/
- **Keep updated:** Use the latest version for security patches
- **Report issues:** If you find malicious skills, report them

### Out of Scope

The following are **not** security vulnerabilities:
- Skills with poor quality or incorrect instructions
- Git clone failures due to network issues
- Skills that don't work as described
- Repository not found errors

### Dependencies

OpenSkills minimizes dependencies for security:
- **Only dependency:** `commander` (CLI framework)
- Regular dependency updates for security patches
- No network requests except `git clone`
- No telemetry or analytics

## Questions?

For security questions that are not vulnerabilities, open a discussion thread on GitHub.

---

**Note:** OpenSkills is not affiliated with Anthropic. For Anthropic security concerns, contact Anthropic directly.
