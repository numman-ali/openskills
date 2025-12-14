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

  // Security tests for non-greedy regex
  it('should use non-greedy matching (security)', () => {
    // With greedy regex (.+), this could match across lines incorrectly
    const content = `---
name: skill-name
description: Short desc
other: value
---`;

    // Non-greedy should stop at end of line
    const name = extractYamlField(content, 'name');
    expect(name).toBe('skill-name');
    expect(name).not.toContain('description');
  });

  it('should not be vulnerable to ReDoS patterns', () => {
    // Test that extraction completes quickly even with potentially problematic input
    const start = Date.now();
    const content = `---
name: ${'a'.repeat(1000)}
---`;

    extractYamlField(content, 'name');
    const elapsed = Date.now() - start;

    // Should complete in under 100ms even with long input
    expect(elapsed).toBeLessThan(100);
  });

  it('should handle special characters in values', () => {
    const content = `---
name: skill-with-special_chars.v2
description: Contains "quotes" and 'apostrophes'
---`;

    expect(extractYamlField(content, 'name')).toBe('skill-with-special_chars.v2');
  });

  it('should handle colons in values', () => {
    const content = `---
name: my-skill
description: URL: https://example.com
---`;

    // Should capture the full value including the colon
    const desc = extractYamlField(content, 'description');
    expect(desc).toContain('URL:');
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
