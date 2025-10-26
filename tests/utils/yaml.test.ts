import { describe, it, expect } from 'vitest';
import { extractYamlField, hasValidFrontmatter } from '../../src/utils/yaml.js';

describe('extractYamlField', () => {
  it('should extract field from YAML frontmatter', () => {
    const content = `---
name: test-skill
description: Test description
---

Content`;

    expect(extractYamlField(content, 'name')).toBe('test-skill');
    expect(extractYamlField(content, 'description')).toBe('Test description');
  });

  it('should return empty string if field not found', () => {
    const content = `---
name: test-skill
---`;

    expect(extractYamlField(content, 'missing')).toBe('');
  });

  it('should handle multiline descriptions', () => {
    const content = `---
name: test
description: First line
---`;

    expect(extractYamlField(content, 'description')).toBe('First line');
  });
});

describe('hasValidFrontmatter', () => {
  it('should return true for valid frontmatter', () => {
    const content = `---
name: test
---

Content`;

    expect(hasValidFrontmatter(content)).toBe(true);
  });

  it('should return false for missing frontmatter', () => {
    const content = 'No frontmatter here';
    expect(hasValidFrontmatter(content)).toBe(false);
  });

  it('should return false for empty content', () => {
    expect(hasValidFrontmatter('')).toBe(false);
  });
});
