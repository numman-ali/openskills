import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export const SKILL_METADATA_FILE = '.openskills.json';

export type SkillSourceType = 'git' | 'github' | 'local';

export interface SkillSourceMetadata {
  source: string;
  sourceType: SkillSourceType;
  repoUrl?: string;
  subpath?: string;
  localPath?: string;
  installedAt: string;
}

export function readSkillMetadata(skillDir: string): SkillSourceMetadata | null {
  const metadataPath = join(skillDir, SKILL_METADATA_FILE);
  if (!existsSync(metadataPath)) return null;

  try {
    const raw = readFileSync(metadataPath, 'utf-8');
    return JSON.parse(raw) as SkillSourceMetadata;
  } catch {
    return null;
  }
}

export function writeSkillMetadata(skillDir: string, metadata: SkillSourceMetadata): void {
  const metadataPath = join(skillDir, SKILL_METADATA_FILE);
  const payload = {
    ...metadata,
    installedAt: metadata.installedAt || new Date().toISOString(),
  };
  writeFileSync(metadataPath, JSON.stringify(payload, null, 2));
}
