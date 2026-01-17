import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { readSkillMetadata, writeSkillMetadata, SKILL_METADATA_FILE } from '../../src/utils/skill-metadata.js';

describe('skill-metadata', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'openskills-metadata-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('writes and reads metadata', () => {
    const payload = {
      source: 'owner/repo',
      sourceType: 'git' as const,
      repoUrl: 'https://github.com/owner/repo',
      subpath: 'skills/demo',
      installedAt: '2026-01-01T00:00:00.000Z',
    };

    writeSkillMetadata(tempDir, payload);
    const read = readSkillMetadata(tempDir);

    expect(read).toMatchObject(payload);
  });

  it('returns null when metadata is missing', () => {
    expect(readSkillMetadata(tempDir)).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    writeFileSync(join(tempDir, SKILL_METADATA_FILE), '{not-json');
    expect(readSkillMetadata(tempDir)).toBeNull();
  });
});
