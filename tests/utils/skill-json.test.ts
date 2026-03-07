import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  readSkillJson,
  resolveSkillEntryPath,
  getResolvedSkillEntries,
} from '../../src/utils/skill-json.js';

const testId = Math.random().toString(36).slice(2);
const testTempDir = join(tmpdir(), `openskills-skill-json-test-${testId}`);

function writeJson(dir: string, filename: string, data: unknown): void {
  writeFileSync(join(dir, filename), JSON.stringify(data, null, 2));
}

describe('skill-json.ts', () => {
  beforeEach(() => {
    mkdirSync(testTempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testTempDir, { recursive: true, force: true });
  });

  // ---------------------------------------------------------------------------
  // readSkillJson
  // ---------------------------------------------------------------------------
  describe('readSkillJson', () => {
    it('should return null when skill.json does not exist', () => {
      const result = readSkillJson(testTempDir);
      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      writeFileSync(join(testTempDir, 'skill.json'), 'not valid json {{');
      const result = readSkillJson(testTempDir);
      expect(result).toBeNull();
    });

    it('should return null when skills array is missing', () => {
      writeJson(testTempDir, 'skill.json', { name: 'repo', version: '1.0.0' });
      const result = readSkillJson(testTempDir);
      expect(result).toBeNull();
    });

    it('should return null when skills array contains entries missing required fields', () => {
      writeJson(testTempDir, 'skill.json', {
        skills: [{ name: 'pdf' }], // missing 'path'
      });
      const result = readSkillJson(testTempDir);
      expect(result).toBeNull();
    });

    it('should return null when skills array contains entries with non-string name', () => {
      writeJson(testTempDir, 'skill.json', {
        skills: [{ name: 42, path: './pdf' }],
      });
      const result = readSkillJson(testTempDir);
      expect(result).toBeNull();
    });

    it('should return null when skills is not an array', () => {
      writeJson(testTempDir, 'skill.json', { skills: 'not-an-array' });
      const result = readSkillJson(testTempDir);
      expect(result).toBeNull();
    });

    it('should parse a minimal valid skill.json', () => {
      writeJson(testTempDir, 'skill.json', {
        skills: [{ name: 'pdf', path: './pdf' }],
      });
      const result = readSkillJson(testTempDir);
      expect(result).not.toBeNull();
      expect(result?.skills).toHaveLength(1);
      expect(result?.skills[0].name).toBe('pdf');
      expect(result?.skills[0].path).toBe('./pdf');
    });

    it('should parse a full-featured skill.json', () => {
      const data = {
        name: 'anthropic-skills',
        version: '2.1.0',
        description: 'Official AI agent skills from Anthropic',
        skills: [
          {
            name: 'pdf',
            path: './pdf',
            description: 'Read, create, merge, split, and OCR PDF files',
            category: 'documents',
            tags: ['pdf', 'ocr', 'merge'],
            integrity: 'sha256-yY1jg1cPGoisxK/ed7yMxPeDkU8UL7pHhPAqIci0wRA=',
            requires: { tools: ['python3'] },
          },
          {
            name: 'skill-creator',
            path: './skill-creator',
            description: 'Create and iterate on new agent skills with evals',
            category: 'development',
            tags: ['meta', 'skill', 'eval'],
          },
        ],
      };
      writeJson(testTempDir, 'skill.json', data);

      const result = readSkillJson(testTempDir);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('anthropic-skills');
      expect(result?.version).toBe('2.1.0');
      expect(result?.skills).toHaveLength(2);

      const pdf = result?.skills[0];
      expect(pdf?.name).toBe('pdf');
      expect(pdf?.category).toBe('documents');
      expect(pdf?.tags).toEqual(['pdf', 'ocr', 'merge']);
      expect(pdf?.requires?.tools).toEqual(['python3']);

      const skillCreator = result?.skills[1];
      expect(skillCreator?.name).toBe('skill-creator');
      expect(skillCreator?.category).toBe('development');
    });

    it('should accept an empty skills array', () => {
      writeJson(testTempDir, 'skill.json', { skills: [] });
      const result = readSkillJson(testTempDir);
      expect(result).not.toBeNull();
      expect(result?.skills).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // resolveSkillEntryPath
  // ---------------------------------------------------------------------------
  describe('resolveSkillEntryPath', () => {
    it('should resolve "./" relative paths against repoDir', () => {
      const resolved = resolveSkillEntryPath('/some/repo', './pdf');
      expect(resolved).toBe('/some/repo/pdf');
    });

    it('should resolve "../" relative paths against repoDir', () => {
      const resolved = resolveSkillEntryPath('/some/repo/sub', '../pdf');
      expect(resolved).toBe('/some/repo/pdf');
    });

    it('should join bare names directly under repoDir', () => {
      const resolved = resolveSkillEntryPath('/some/repo', 'pdf');
      expect(resolved).toBe('/some/repo/pdf');
    });

    it('should handle nested relative paths', () => {
      const resolved = resolveSkillEntryPath('/some/repo', './category/pdf');
      expect(resolved).toBe('/some/repo/category/pdf');
    });
  });

  // ---------------------------------------------------------------------------
  // getResolvedSkillEntries
  // ---------------------------------------------------------------------------
  describe('getResolvedSkillEntries', () => {
    it('should return entries for existing skill directories', () => {
      const skillDir = join(testTempDir, 'pdf');
      mkdirSync(skillDir, { recursive: true });

      const skillJson = {
        skills: [
          { name: 'pdf', path: './pdf', description: 'PDF tools', category: 'documents' },
        ],
      };

      const entries = getResolvedSkillEntries(testTempDir, skillJson);
      expect(entries).toHaveLength(1);
      expect(entries[0].name).toBe('pdf');
      expect(entries[0].resolvedPath).toBe(skillDir);
      expect(entries[0].category).toBe('documents');
    });

    it('should exclude entries whose directories do not exist', () => {
      const skillJson = {
        skills: [
          { name: 'pdf', path: './pdf', description: 'PDF tools' },
          { name: 'missing', path: './missing', description: 'Does not exist' },
        ],
      };

      // Only create the 'pdf' directory
      mkdirSync(join(testTempDir, 'pdf'), { recursive: true });

      const entries = getResolvedSkillEntries(testTempDir, skillJson);
      expect(entries).toHaveLength(1);
      expect(entries[0].name).toBe('pdf');
    });

    it('should return empty array when no entries exist on disk', () => {
      const skillJson = {
        skills: [{ name: 'ghost', path: './ghost', description: 'Missing' }],
      };

      const entries = getResolvedSkillEntries(testTempDir, skillJson);
      expect(entries).toHaveLength(0);
    });

    it('should preserve tags and other metadata on entries', () => {
      mkdirSync(join(testTempDir, 'pdf'), { recursive: true });

      const skillJson = {
        skills: [
          {
            name: 'pdf',
            path: './pdf',
            description: 'PDF tools',
            tags: ['pdf', 'ocr'],
            requires: { tools: ['python3'] },
          },
        ],
      };

      const entries = getResolvedSkillEntries(testTempDir, skillJson);
      expect(entries[0].tags).toEqual(['pdf', 'ocr']);
      expect(entries[0].requires?.tools).toEqual(['python3']);
    });
  });
});
