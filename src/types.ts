export interface Skill {
  name: string;
  description: string;
  location: 'project' | 'global';
  path: string;
  category?: string;
  tags?: string[];
  version?: string;
}

/**
 * A single skill entry within a skill.json index file
 */
export interface SkillJsonEntry {
  name: string;
  path: string;
  description: string;
  category?: string;
  tags?: string[];
  integrity?: string;
  requires?: {
    tools?: string[];
    [key: string]: unknown;
  };
}

/**
 * The top-level shape of a skill.json file in a source repo
 */
export interface SkillJson {
  name?: string;
  version?: string;
  description?: string;
  skills: SkillJsonEntry[];
}

export interface SkillLocation {
  path: string;
  baseDir: string;
  source: string;
}

export interface InstallOptions {
  global?: boolean;
  universal?: boolean;
  yes?: boolean;
}

export interface SkillMetadata {
  name: string;
  description: string;
  context?: string;
}
