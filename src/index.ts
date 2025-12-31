/**
 * OpenSkills Library Exports
 * 
 * This module exports utility functions and types for external consumption,
 * enabling VSCode extensions and other tools to reuse openskills functionality.
 */

// YAML utilities
export { extractYamlField, hasValidFrontmatter } from './utils/yaml.js';

// Directory utilities
export { getSkillsDir, getSearchDirs } from './utils/dirs.js';

// Skills discovery
export { findAllSkills, findSkill } from './utils/skills.js';

// AGENTS.md manipulation
export {
    parseCurrentSkills,
    generateSkillsXml,
    replaceSkillsSection,
    removeSkillsSection,
} from './utils/agents-md.js';

// Types
export type { Skill, SkillLocation } from './types.js';
