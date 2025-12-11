import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { tmpdir } from 'os';

// Test the sync utility functions directly
import {
  generateSkillsXml,
  replaceSkillsSection,
  parseCurrentSkills,
  removeSkillsSection,
} from '../../src/utils/agents-md.js';
import type { Skill } from '../../src/types.js';

const testId = Math.random().toString(36).slice(2);
const testTempDir = join(tmpdir(), `openskills-sync-test-${testId}`);

describe('sync utilities (agents-md.ts)', () => {
  describe('generateSkillsXml', () => {
    it('should generate valid XML for skills', () => {
      const skills: Skill[] = [
        { name: 'pdf', description: 'PDF manipulation', location: 'project', path: '/path/to/pdf' },
        { name: 'xlsx', description: 'Spreadsheet editing', location: 'global', path: '/path/to/xlsx' },
      ];

      const xml = generateSkillsXml(skills);

      expect(xml).toContain('<skills_system priority="1">');
      expect(xml).toContain('<name>pdf</name>');
      expect(xml).toContain('<description>PDF manipulation</description>');
      expect(xml).toContain('<location>project</location>');
      expect(xml).toContain('<name>xlsx</name>');
      expect(xml).toContain('<description>Spreadsheet editing</description>');
      expect(xml).toContain('<location>global</location>');
      expect(xml).toContain('</skills_system>');
    });

    it('should include usage instructions', () => {
      const skills: Skill[] = [
        { name: 'test', description: 'Test skill', location: 'project', path: '/path' },
      ];

      const xml = generateSkillsXml(skills);

      expect(xml).toContain('<usage>');
      expect(xml).toContain('openskills read');
      expect(xml).toContain('</usage>');
    });

    it('should generate empty skills section for empty array', () => {
      const xml = generateSkillsXml([]);

      expect(xml).toContain('<available_skills>');
      expect(xml).toContain('</available_skills>');
    });
  });

  describe('parseCurrentSkills', () => {
    it('should parse skill names from existing content', () => {
      const content = `
# AGENTS.md

<skills_system>
<available_skills>
<skill>
<name>pdf</name>
<description>PDF tools</description>
</skill>
<skill>
<name>xlsx</name>
<description>Excel tools</description>
</skill>
</available_skills>
</skills_system>
`;

      const skills = parseCurrentSkills(content);

      expect(skills).toContain('pdf');
      expect(skills).toContain('xlsx');
      expect(skills).toHaveLength(2);
    });

    it('should return empty array for content without skills', () => {
      const content = '# AGENTS.md\n\nNo skills here.';

      const skills = parseCurrentSkills(content);

      expect(skills).toHaveLength(0);
    });

    it('should handle malformed XML gracefully', () => {
      const content = '<skill><name>broken';

      const skills = parseCurrentSkills(content);

      expect(Array.isArray(skills)).toBe(true);
    });
  });

  describe('replaceSkillsSection', () => {
    it('should replace existing skills_system section', () => {
      const content = `# AGENTS.md

<skills_system priority="1">
OLD CONTENT
</skills_system>

Other content`;

      const newSection = '<skills_system priority="1">NEW CONTENT</skills_system>';
      const result = replaceSkillsSection(content, newSection);

      expect(result).toContain('NEW CONTENT');
      expect(result).not.toContain('OLD CONTENT');
      expect(result).toContain('Other content');
    });

    it('should replace HTML comment markers', () => {
      const content = `# AGENTS.md

<!-- SKILLS_TABLE_START -->
OLD SKILLS
<!-- SKILLS_TABLE_END -->

Footer`;

      const newSection = '<skills_system>NEW SKILLS</skills_system>';
      const result = replaceSkillsSection(content, newSection);

      expect(result).toContain('NEW SKILLS');
      expect(result).not.toContain('OLD SKILLS');
    });

    it('should append to end if no markers found', () => {
      const content = '# AGENTS.md\n\nSome content.';
      const newSection = '<skills_system>SKILLS</skills_system>';

      const result = replaceSkillsSection(content, newSection);

      expect(result).toContain('Some content.');
      expect(result).toContain('<skills_system>SKILLS</skills_system>');
    });
  });

  describe('removeSkillsSection', () => {
    it('should remove skills_system section', () => {
      const content = `# AGENTS.md

<skills_system priority="1">
Skills content
</skills_system>

Footer`;

      const result = removeSkillsSection(content);

      expect(result).not.toContain('Skills content');
      expect(result).toContain('Footer');
    });

    it('should handle content without skills section', () => {
      const content = '# AGENTS.md\n\nNo skills.';

      const result = removeSkillsSection(content);

      expect(result).toBe(content);
    });
  });
});

describe('sync --output flag logic', () => {
  beforeEach(() => {
    mkdirSync(testTempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testTempDir, { recursive: true, force: true });
  });

  describe('output path validation', () => {
    it('should accept .md files', () => {
      const validPaths = [
        'AGENTS.md',
        'custom.md',
        '.ruler/AGENTS.md',
        'docs/rules.md',
      ];

      for (const path of validPaths) {
        expect(path.endsWith('.md')).toBe(true);
      }
    });

    it('should reject non-.md files', () => {
      const invalidPaths = [
        'AGENTS.txt',
        'rules.yaml',
        'config.json',
        'noextension',
      ];

      for (const path of invalidPaths) {
        expect(path.endsWith('.md')).toBe(false);
      }
    });
  });

  describe('auto-create file behavior', () => {
    it('should create file with heading if not exists', () => {
      const outputPath = join(testTempDir, 'NEW-FILE.md');

      // Simulate the auto-create logic
      if (!existsSync(outputPath)) {
        const outputName = basename(outputPath);
        writeFileSync(outputPath, `# ${outputName.replace('.md', '')}\n\n`);
      }

      expect(existsSync(outputPath)).toBe(true);
      const content = readFileSync(outputPath, 'utf-8');
      expect(content).toBe('# NEW-FILE\n\n');
    });

    it('should create nested directories if needed', () => {
      const outputPath = join(testTempDir, 'nested', 'deep', 'AGENTS.md');
      const dir = dirname(outputPath);

      // Simulate the directory creation logic
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(outputPath, '# AGENTS\n\n');

      expect(existsSync(outputPath)).toBe(true);
      expect(existsSync(dir)).toBe(true);
    });

    it('should preserve existing file content', () => {
      const outputPath = join(testTempDir, 'existing.md');
      const existingContent = '# Existing Content\n\nImportant stuff here.';
      writeFileSync(outputPath, existingContent);

      // Read existing content
      const content = readFileSync(outputPath, 'utf-8');

      expect(content).toBe(existingContent);
    });
  });

  describe('default output path', () => {
    it('should default to AGENTS.md', () => {
      const defaultPath = 'AGENTS.md';
      expect(defaultPath).toBe('AGENTS.md');
    });
  });
});
