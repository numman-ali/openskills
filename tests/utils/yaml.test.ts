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

  it('should handle single-line descriptions', () => {
    const content = `---
name: test
description: First line
---`;

    expect(extractYamlField(content, 'description')).toBe('First line');
  });

  it('should parse multiline YAML description with folded scalar (>)', () => {
    // This tests the exact bug from issue #69
    const content = `---
name: test-multiline-skill
description: >
  This is a comprehensive guide for using this skill effectively. Use this skill when:
  (1) setting up your development environment,
  (2) configuring core services and dependencies,
  (3) implementing authentication and caching strategies,
  (4) writing queries, mutations, or other operations,
---`;

    const desc = extractYamlField(content, 'description');
    expect(desc).toContain('This is a comprehensive guide');
    expect(desc).toContain('setting up your development environment');
    expect(desc).toContain('configuring core services');
    expect(desc).not.toBe('>'); // Should not just capture the '>' character
  });

  it('should parse multiline YAML description with literal scalar (|)', () => {
    const content = `---
name: test-skill
description: |
  Line 1
  Line 2
  Line 3
---`;

    const desc = extractYamlField(content, 'description');
    expect(desc).toContain('Line 1');
    expect(desc).toContain('Line 2');
    expect(desc).toContain('Line 3');
  });

  it('should handle complex multiline with indentation', () => {
    const content = `---
name: complex-skill
description: >
  This is a very long description
  that spans multiple lines
  with consistent indentation.
  
  It even has a blank line above.
---`;

    const desc = extractYamlField(content, 'description');
    expect(desc).toContain('This is a very long description');
    expect(desc).toContain('that spans multiple lines');
    expect(desc.length).toBeGreaterThan(50); // Should be much longer than just '>'
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
description: "URL: https://example.com"
---`;

    // Should capture the full value including the colon
    const desc = extractYamlField(content, 'description');
    expect(desc).toContain('URL:');
    expect(desc).toContain('https://example.com');
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
