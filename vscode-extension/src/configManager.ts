import * as vscode from 'vscode';
import { SkillRepo } from './types';

export class ConfigManager {
    static getRepos(): SkillRepo[] {
        const config = vscode.workspace.getConfiguration('openskills');
        return config.get<SkillRepo[]>('repositories') || [];
    }

    static async addRepo(url: string) {
        const config = vscode.workspace.getConfiguration('openskills');
        const repos = this.getRepos();
        if (repos.some(r => r.url === url)) {
            return;
        }

        // Remove .git suffix and username for shorter name
        let name = url.split('/').pop()?.replace('.git', '') || url;
        repos.push({ url, name });
        await config.update('repositories', repos, vscode.ConfigurationTarget.Global);
    }

    static async updateRepo(url: string, updates: Partial<SkillRepo>) {
        const config = vscode.workspace.getConfiguration('openskills');
        let repos = this.getRepos();
        const index = repos.findIndex(r => r.url === url);
        if (index !== -1) {
            repos[index] = { ...repos[index], ...updates };
            await config.update('repositories', repos, vscode.ConfigurationTarget.Global);
        }
    }

    static async removeRepo(url: string) {
        const config = vscode.workspace.getConfiguration('openskills');
        let repos = this.getRepos();
        repos = repos.filter(r => r.url !== url);
        await config.update('repositories', repos, vscode.ConfigurationTarget.Global);
    }
}
