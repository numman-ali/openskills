import * as vscode from 'vscode';
import { SkillRepo } from './types';
import { GitService } from './services/git';

// Preset repositories that are always included
const PRESET_REPOS: SkillRepo[] = [
    { url: 'https://github.com/anthropics/skills.git', name: 'anthropics/skills', isPreset: true },
    { url: 'https://github.com/openai/skills.git', name: 'openai/skills', isPreset: true },
    { url: 'https://github.com/skillcreatorai/Ai-Agent-Skills.git', name: 'skillcreatorai/Ai-Agent-Skills', isPreset: true },
    { url: 'https://github.com/obra/superpowers.git', name: 'obra/superpowers', isPreset: true },
    { url: 'https://github.com/ComposioHQ/awesome-claude-skills.git', name: 'ComposioHQ/awesome-claude-skills', isPreset: true }
];

export class ConfigManager {
    static getRepos(): SkillRepo[] {
        const config = vscode.workspace.getConfiguration('agentskills');
        const userRepos = config.get<SkillRepo[]>('repositories') || [];
        // Merge preset repos with user repos, preset first, avoiding duplicates
        return [...PRESET_REPOS, ...userRepos.filter(r => !PRESET_REPOS.some(p => p.url === r.url))];
    }

    static async ensurePresetRepos(): Promise<void> {
        // Auto-pull preset repos on startup
        for (const repo of PRESET_REPOS) {
            try {
                await GitService.pullRepo(repo.url, repo.branch);
            } catch (e) {
                console.error(`Failed to pull preset repo ${repo.name}:`, e);
            }
        }
    }

    static async addRepo(url: string) {
        const config = vscode.workspace.getConfiguration('agentskills');
        const repos = this.getRepos();
        if (repos.some(r => r.url === url)) {
            return;
        }

        // Extract "owner/repo" format for better identification
        const urlParts = url.replace('.git', '').split('/');
        const repo = urlParts.pop() || '';
        const owner = urlParts.pop() || '';
        let name = owner && repo ? `${owner}/${repo}` : repo || url;
        repos.push({ url, name });
        await config.update('repositories', repos, vscode.ConfigurationTarget.Global);
    }

    static async updateRepo(url: string, updates: Partial<SkillRepo>) {
        const config = vscode.workspace.getConfiguration('agentskills');
        let repos = this.getRepos();
        const index = repos.findIndex(r => r.url === url);
        if (index !== -1) {
            repos[index] = { ...repos[index], ...updates };
            await config.update('repositories', repos, vscode.ConfigurationTarget.Global);
        }
    }

    static async removeRepo(url: string) {
        const config = vscode.workspace.getConfiguration('agentskills');
        let repos = this.getRepos();
        repos = repos.filter(r => r.url !== url);
        await config.update('repositories', repos, vscode.ConfigurationTarget.Global);
    }
}
