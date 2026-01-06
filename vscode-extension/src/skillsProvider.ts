import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager } from './configManager';
import { GitUtils } from './gitUtils';
import { Skill, SkillRepo } from './types';
import { getIdeConfig } from 'openskills';

export class SkillsProvider implements vscode.TreeDataProvider<SkillRepo | Skill> {
    private _onDidChangeTreeData: vscode.EventEmitter<SkillRepo | Skill | undefined | null | void> = new vscode.EventEmitter<SkillRepo | Skill | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SkillRepo | Skill | undefined | null | void> = this._onDidChangeTreeData.event;

    private checkedSkills: Set<string> = new Set();
    private syncedSkillsCache: Set<string> = new Set();
    private skillCache: Map<string, Skill> = new Map();

    refresh(): void {
        this.updateSyncedSkillsCache();
        this._onDidChangeTreeData.fire();
    }

    setChecked(skill: Skill, checked: boolean): void {
        const key = this.getSkillKey(skill);
        if (checked) {
            this.checkedSkills.add(key);
            // Ensure cache has the latest skill object (handled in getChildren usually, but good to have)
            this.skillCache.set(key, skill);
        } else {
            this.checkedSkills.delete(key);
        }
    }

    getCheckedSkills(): Skill[] {
        const result: Skill[] = [];
        for (const key of this.checkedSkills) {
            if (this.skillCache.has(key)) {
                result.push(this.skillCache.get(key)!);
            }
        }
        return result;
    }

    clearSelection(): void {
        this.checkedSkills.clear();
        this.refresh();
    }

    private getSkillKey(skill: Skill): string {
        return `${skill.repoUrl}::${skill.name}`;
    }

    private getWorkspaceRoot(): string | undefined {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }

    private getInstalledSkillsDir(): string | undefined {
        const root = this.getWorkspaceRoot();
        if (!root) return undefined;
        return path.join(root, '.agent', 'skills');
    }

    private isSkillInstalled(skillName: string): boolean {
        const dir = this.getInstalledSkillsDir();
        if (!dir) return false;
        return fs.existsSync(path.join(dir, skillName, 'SKILL.md'));
    }

    private updateSyncedSkillsCache(): void {
        this.syncedSkillsCache.clear();
        const root = this.getWorkspaceRoot();
        if (!root) return;

        if (!root) return;

        const config = getIdeConfig(vscode.env.appName);
        const agentsPath = path.join(root, config.rulesFile);
        if (!fs.existsSync(agentsPath)) return;

        const content = fs.readFileSync(agentsPath, 'utf-8');
        // Parse skill names from <name>xxx</name> tags
        const regex = /<name>([^<]+)<\/name>/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            this.syncedSkillsCache.add(match[1].trim());
        }
    }

    private isSkillSynced(skillName: string): boolean {
        return this.syncedSkillsCache.has(skillName);
    }

    getTreeItem(element: SkillRepo | Skill): vscode.TreeItem {
        if ('url' in element) {
            // It's a Repo
            const item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.Collapsed);
            item.contextValue = 'skillRepo';
            item.description = element.branch ? `[${element.branch}]` : '';
            item.tooltip = element.url;
            item.iconPath = new vscode.ThemeIcon('repo');
            return item;
        } else {
            // It's a Skill
            const installed = this.isSkillInstalled(element.name);
            const synced = this.isSkillSynced(element.name);
            const item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.None);

            // Build status string
            const status: string[] = [];
            if (installed) status.push('Installed');
            if (synced) status.push('Synced');

            item.contextValue = installed ? 'skillInstalled' : 'skill';
            item.description = status.length > 0 ? `[${status.join(', ')}]` : element.description;
            item.tooltip = `${element.name}\n${element.description}\n${element.path}`;

            // Icon based on status
            let iconName = 'tools';
            if (installed && synced) {
                iconName = 'pass-filled';
            } else if (installed) {
                iconName = 'check';
            }
            item.iconPath = new vscode.ThemeIcon(iconName);

            const key = this.getSkillKey(element);
            item.checkboxState = this.checkedSkills.has(key)
                ? vscode.TreeItemCheckboxState.Checked
                : vscode.TreeItemCheckboxState.Unchecked;

            return item;
        }
    }

    async getChildren(element?: SkillRepo | Skill): Promise<(SkillRepo | Skill)[]> {
        if (!element) {
            // Root: return repos
            this.updateSyncedSkillsCache();
            // Clear skill cache on full refresh? Maybe not, incremental is fine.
            return ConfigManager.getRepos();
        } else if ('url' in element) {
            // Repo: return skills
            try {
                const skills = await GitUtils.getSkillsFromRepo(element.url, element.branch);
                skills.forEach(s => {
                    s.installed = this.isSkillInstalled(s.name);
                    // Update cache
                    this.skillCache.set(this.getSkillKey(s), s);
                });
                return skills;
            } catch (e) {
                vscode.window.showErrorMessage(`Failed to load skills from ${element.name}: ${e}`);
                return [];
            }
        }
        return [];
    }
}
