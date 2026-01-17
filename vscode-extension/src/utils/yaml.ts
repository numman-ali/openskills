/**
 * Extract field from YAML frontmatter
 */
export function extractYamlField(content: string, field: string): string {
    const match = content.match(new RegExp(`^${field}:\\s*(.+?)$`, 'm'));
    return match ? match[1].trim() : '';
}

/**
 * Validate SKILL.md has proper YAML frontmatter
 */
export function hasValidFrontmatter(content: string): boolean {
    return content.trim().startsWith('---');
}
