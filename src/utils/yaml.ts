import matter from 'gray-matter';

/**
 * Extract field from YAML frontmatter
 * Uses gray-matter to properly parse multiline YAML descriptions (using > or | syntax)
 */
export function extractYamlField(content: string, field: string): string {
  try {
    const result = matter(content);
    const value = result.data[field];
    
    // Handle different value types
    if (value === undefined || value === null) {
      return '';
    }
    
    // Convert to string and trim
    return String(value).trim();
  } catch {
    // Fallback to empty string if parsing fails
    return '';
  }
}

/**
 * Validate SKILL.md has proper YAML frontmatter
 */
export function hasValidFrontmatter(content: string): boolean {
  return content.trim().startsWith('---');
}
