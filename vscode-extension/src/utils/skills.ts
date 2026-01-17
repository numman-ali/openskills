import * as os from 'os';
import * as path from 'path';
import { IDE_CONFIGS } from './ide';

/**
 * Represents a skill directory with metadata
 */
export interface SkillDirectory {
    path: string;
    displayName: string;
    isProject: boolean;
    icon: string;
}

function toDisplayPath(relPath: string): string {
    return relPath.replace(/\\/g, '/');
}

/**
 * Get all skill directories with metadata
 */
export function getSkillDirectories(workspaceRoot: string): SkillDirectory[] {
    const uniqueProjectSkillDirs = Array.from(
        new Set(Object.values(IDE_CONFIGS).map(c => c.skillsDir))
    );

    const projectDirs: SkillDirectory[] = uniqueProjectSkillDirs.map((relDir) => {
        const displayName = toDisplayPath(relDir);
        const icon = displayName.startsWith('.claude/') ? 'folder' : 'folder-library';
        return {
            path: path.join(workspaceRoot, relDir),
            displayName,
            isProject: true,
            icon,
        };
    });

    const globalDirs: SkillDirectory[] = [
        {
            path: path.join(os.homedir(), '.claude', 'skills'),
            displayName: '~/.claude/skills',
            isProject: false,
            icon: 'home',
        },
        {
            path: path.join(os.homedir(), '.codex', 'skills'),
            displayName: '~/.codex/skills',
            isProject: false,
            icon: 'home',
        },
    ];

    return [...projectDirs, ...globalDirs];
}
