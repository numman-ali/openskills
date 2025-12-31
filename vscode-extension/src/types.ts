export interface Skill {
    name: string;
    description: string;
    path: string; // Relative path in the repo
    repoUrl: string;
    localPath?: string; // If locally cloned
    installed?: boolean; // Whether installed in current workspace
}

export interface SkillRepo {
    url: string;
    name: string; // User friendly name or derived from URL
    branch?: string;
}
