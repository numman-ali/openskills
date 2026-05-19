import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export const SKILL_METADATA_FILE = '.openskills.json';

export type SkillSourceType = 'git' | 'github' | 'local';

export interface SkillSourceMetadata {
  source: string;
  sourceType: SkillSourceType;
  repoUrl?: string;
  subpath?: string;
  localPath?: string;
  installedAt: string;
  commitSha?: string;
  commitUrl?: string;
}

const GIT_SUFFIX = '.git';
const SSH_PREFIX = 'git@';

/**
 * Per-host commit-URL builders. To support a new git host, add an entry
 * here keyed by `URL.hostname`. Each builder receives the full `repoPath`
 * (everything between the hostname and the optional `.git` suffix) plus
 * the SHA, and returns a clickable `https://` URL — or undefined if the
 * repoPath isn't valid for that host (e.g. wrong number of segments).
 *
 * Only github is registered today. To add another host, add one entry
 * below with that host's commit-URL pattern.
 */
type CommitUrlBuilder = (repoPath: string, commitSha: string) => string | undefined;
const COMMIT_URL_BUILDERS: Record<string, CommitUrlBuilder> = {
  'github.com': (repoPath, commitSha) => {
    // Github repos are always exactly `<owner>/<repo>` — no nested orgs or
    // subpaths. Anything else is either malformed or not a clone URL.
    const parts = repoPath.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return undefined;
    }
    return `https://github.com/${repoPath}/commit/${commitSha}`;
  },
};

/**
 * Build a browser-clickable commit URL from a clone-URL + SHA.
 * Returns undefined when the host has no registered builder in
 * COMMIT_URL_BUILDERS (or its builder rejects the repo path) so callers
 * can omit the field.
 */
export function buildCommitUrl(repoUrl: string, commitSha: string): string | undefined {
  const parsed = parseCloneUrl(repoUrl);
  if (!parsed) {
    // Couldn't parse the URL at all (malformed or non-clone string).
    return undefined;
  }

  const buildUrl = COMMIT_URL_BUILDERS[parsed.host];
  if (!buildUrl) {
    // No builder registered for this host — we don't know its commit-URL pattern.
    return undefined;
  }

  return buildUrl(parsed.repoPath, commitSha);
}

/**
 * Parse a clone URL into host + repoPath. Returns null when parsing fails.
 */
function parseCloneUrl(repoUrl: string): { host: string; repoPath: string } | null {
  const parsed = sshToHttps(repoUrl.trim());
  if (!parsed) {
    // Either malformed SSH or `new URL()` rejected the input.
    return null;
  }

  // `pathname` always starts with '/'. Strip the leading slash to get the
  // repo path (e.g. `anthropics/skills` or `anthropics/skills.git`).
  let repoPath = parsed.pathname.slice(1);
  if (repoPath.endsWith(GIT_SUFFIX)) {
    // Trailing `.git` is conventional in clone URLs but isn't part of the
    // repo's identity — strip it so builders get a clean path.
    repoPath = repoPath.slice(0, -GIT_SUFFIX.length);
  }

  return { host: parsed.hostname, repoPath };
}

/**
 * Convert any clone URL into a parsed `URL` object, rewriting SSH form
 * (`git@host:owner/repo[.git]`) to HTTPS first since SSH isn't a valid URI.
 * Non-SSH inputs are handed straight to `new URL()`.
 *
 * Returns null when the input can't be parsed: malformed SSH (starts with
 * `git@` but missing the ':' separator), or anything `new URL()` rejects
 * (bare local paths, free-form strings, unsupported schemes).
 *
 * Case of host and path is preserved during the SSH rewrite — `URL()` will
 * lowercase the host on parse, and path is case-sensitive on github
 * (Anthropics ≠ anthropics), so we hand the path through untouched.
 */
function sshToHttps(input: string): URL | null {
  let candidate = input;

  // Case-insensitive prefix check so weird-cased inputs like `Git@host:...`
  // are still recognized as SSH.
  const isSshForm = input.slice(0, SSH_PREFIX.length).toLowerCase() === SSH_PREFIX;
  if (isSshForm) {
    // Convert "git@host:owner/repo" → "https://host/owner/repo" by swapping
    // the first ':' for '/' and prepending the scheme.
    const afterPrefix = input.slice(SSH_PREFIX.length);
    const colonIdx = afterPrefix.indexOf(':');
    if (colonIdx === -1) {
      // SSH-shaped input missing the ':' separator — can't be rewritten.
      return null;
    }
    const host = afterPrefix.slice(0, colonIdx);
    const path = afterPrefix.slice(colonIdx + 1);
    candidate = `https://${host}/${path}`;
  }

  try {
    return new URL(candidate);
  } catch {
    // URL constructor rejected the candidate (bare local path, garbage, etc).
    return null;
  }
}

export function readSkillMetadata(skillDir: string): SkillSourceMetadata | null {
  const metadataPath = join(skillDir, SKILL_METADATA_FILE);
  if (!existsSync(metadataPath)) return null;

  try {
    const raw = readFileSync(metadataPath, 'utf-8');
    return JSON.parse(raw) as SkillSourceMetadata;
  } catch {
    return null;
  }
}

export function writeSkillMetadata(skillDir: string, metadata: SkillSourceMetadata): void {
  const metadataPath = join(skillDir, SKILL_METADATA_FILE);
  const payload = {
    ...metadata,
    installedAt: metadata.installedAt || new Date().toISOString(),
  };
  writeFileSync(metadataPath, JSON.stringify(payload, null, 2));
}
