import { parseDocument } from 'yaml';

/**
 * Extract field from YAML frontmatter
 */
export function extractYamlField(content: string, field: string): string {
  const frontmatter = content.trimStart().match(/^---[ \t]*\r?\n([\s\S]*?)^---[ \t]*\r?$/m);
  if (frontmatter?.index === 0) {
    const document = parseDocument(frontmatter[1]);
    if (document.errors.length === 0) {
      const value = document.get(field);
      return typeof value === 'string' ? value.trim() : '';
    }
  }

  // Older skills can contain unquoted values that are not valid YAML.
  const match = content.match(new RegExp(`^${field}:\\s*(.+?)$`, 'm'));
  return match ? match[1].trim() : '';
}

/**
 * Validate SKILL.md has proper YAML frontmatter
 */
export function hasValidFrontmatter(content: string): boolean {
  return content.trim().startsWith('---');
}
