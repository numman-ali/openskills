import { describe, it, expect } from 'vitest';
import { normalizeSkillNames } from '../../src/utils/skill-names.js';

describe('normalizeSkillNames', () => {
  it('splits comma-separated names', () => {
    expect(normalizeSkillNames('alpha,beta')).toEqual(['alpha', 'beta']);
  });

  it('trims whitespace and removes empties', () => {
    expect(normalizeSkillNames(' alpha, , beta ,')).toEqual(['alpha', 'beta']);
  });

  it('supports arrays with comma values', () => {
    expect(normalizeSkillNames(['alpha', 'beta,gamma'])).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('deduplicates names', () => {
    expect(normalizeSkillNames(['alpha', 'alpha', 'beta'])).toEqual(['alpha', 'beta']);
  });

  it('returns empty array for undefined', () => {
    expect(normalizeSkillNames(undefined)).toEqual([]);
  });
});
