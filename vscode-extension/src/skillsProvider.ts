import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager } from './configManager';
import { GitService } from './services/git';
import { Skill, SkillRepo, SkillMatchStatus, LocalSkillsGroup, LocalSkill } from './types';
import { detectIde, getProjectSkillsDir } from './utils/ide';
import { getCachedSkillHash, clearHashCache } from './utils/skillCompare';
import { getSkillDirectories } from './utils/skills';
import { extractYamlField } from './utils/yaml';

// Union type for all tree node types
type TreeNode = SkillRepo | Skill | LocalSkillsGroup | LocalSkill;

// Type guards
function isSkillRepo(node: TreeNode): node is SkillRepo {
    return 'url' in node && !('type' in node);
}

function isSkill(node: TreeNode): node is Skill {
    return 'repoUrl' in node && !('type' in node);
}

function isLocalSkillsGroup(node: TreeNode): node is LocalSkillsGroup {
    return 'type' in node && node.type === 'local-group';
}

function isLocalSkill(node: TreeNode): node is LocalSkill {
    return 'type' in node && node.type === 'local-skill';
}

export class SkillsProvider implements vscode.TreeDataProvider<TreeNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeNode | undefined | null | void> = new vscode.EventEmitter<TreeNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeNode | undefined | null | void> = this._onDidChangeTreeData.event;
    private _onDidChangeSearchQuery: vscode.EventEmitter<string> = new vscode.EventEmitter<string>();
    readonly onDidChangeSearchQuery: vscode.Event<string> = this._onDidChangeSearchQuery.event;

    private checkedSkills: Set<string> = new Set();
    private skillCache: Map<string, Skill> = new Map();
    private installedSkillHashes: Map<string, string> = new Map(); // skillName -> hash
    private repoSkillsIndex: Map<string, Skill[]> = new Map();
    private localSkillsIndex: Map<string, LocalSkill[]> = new Map();
    private repoConnectivity: Map<string, { ok: boolean; checkedAt: number }> = new Map();
    private repoOrder: string[] = [];
    private localGroupOrder: string[] = [];
    private searchQuery: string = '';
    private indexingPromise: Promise<void> | undefined;
    private localGroupByPath: Map<string, LocalSkillsGroup> = new Map();
    private repoByUrl: Map<string, SkillRepo> = new Map();
    private lastRootNodes: TreeNode[] = [];

    constructor(
        private readonly memento?: vscode.Memento,
        private readonly outputChannel?: vscode.OutputChannel
    ) {
        this.log('SkillsProvider initialized');
        this.repoOrder = this.memento?.get<string[]>('agentskills.repoOrder') ?? [];
        this.localGroupOrder = this.memento?.get<string[]>('agentskills.localGroupOrder') ?? [];
    }

    refresh(): void {
        clearHashCache();
        this.updateInstalledSkillHashes();
        this._onDidChangeTreeData.fire();
        void this.buildIndex();
    }

    refreshInstalledAndLocal(): void {
        clearHashCache();
        this.updateInstalledSkillHashes();
        this.recomputeRepoSkillStates();
        this.rebuildLocalIndex();
        this._onDidChangeTreeData.fire();
    }

    setChecked(skill: Skill, checked: boolean): void {
        const key = this.getSkillKey(skill);
        if (checked) {
            this.checkedSkills.add(key);
            this.skillCache.set(key, skill);
        } else {
            this.checkedSkills.delete(key);
        }
    }

    getCheckedSkills(): Skill[] {
        const result: Skill[] = [];
        for (const key of this.checkedSkills) {
            const skill = this.skillCache.get(key);
            if (skill) {
                result.push(skill);
            }
        }
        return result;
    }

    clearSelection(): void {
        this.checkedSkills.clear();
        this._onDidChangeTreeData.fire();
    }

    setSearchQuery(query: string): void {
        this.searchQuery = query.trim();
        this._onDidChangeSearchQuery.fire(this.searchQuery);
        this._onDidChangeTreeData.fire();
    }

    getSearchQuery(): string {
        return this.searchQuery;
    }

    checkAllMatchingRepoSkills(): void {
        const skills = this.getAllMatchingRepoSkills();
        for (const skill of skills) {
            if (skill.matchStatus === SkillMatchStatus.Conflict) continue;
            this.setChecked(skill, true);
        }
        this._onDidChangeTreeData.fire();
    }

    checkAllSkillsInRepo(repo: SkillRepo): void {
        const skills = this.repoSkillsIndex.get(repo.url) ?? [];
        const candidates = this.searchQuery ? this.filterSkills(skills) : skills;
        for (const skill of candidates) {
            if ((skill.matchStatus ?? this.getSkillMatchStatus(skill)) === SkillMatchStatus.Conflict) continue;
            this.setChecked(skill, true);
        }
        this._onDidChangeTreeData.fire();
    }

    clearCheckedSkillsInRepo(repo: SkillRepo): void {
        const skills = this.repoSkillsIndex.get(repo.url) ?? [];
        for (const skill of skills) {
            const key = this.getSkillKey(skill);
            this.checkedSkills.delete(key);
        }
        this._onDidChangeTreeData.fire();
    }

    uncheckAllSkills(): void {
        this.checkedSkills.clear();
        this._onDidChangeTreeData.fire();
    }

    private rebuildLocalIndex(): void {
        const localGroups = this.getLocalSkillsGroups();
        this.localSkillsIndex.clear();
        for (const group of localGroups) {
            const skills = this.getLocalSkillsFromGroup(group);
            this.localSkillsIndex.set(group.path, skills);
        }
    }

    private recomputeRepoSkillStates(): void {
        for (const skills of this.repoSkillsIndex.values()) {
            for (const s of skills) {
                s.matchStatus = this.getSkillMatchStatus(s);
                s.installed = s.matchStatus === SkillMatchStatus.Matched;
                this.skillCache.set(this.getSkillKey(s), s);
            }
        }
    }

    async waitForIndexing(): Promise<void> {
        await this.indexingPromise;
    }

    getExpandableRootsForSearch(): Array<SkillRepo | LocalSkillsGroup> {
        if (!this.searchQuery) return [];
        const result: Array<SkillRepo | LocalSkillsGroup> = [];
        for (const node of this.lastRootNodes) {
            if (isLocalSkillsGroup(node)) {
                if (node.isActive || this.getLocalGroupMatchedCount(node) > 0) result.push(node);
            } else if (isSkillRepo(node)) {
                if (this.getRepoMatchedCount(node) > 0) result.push(node);
            }
        }
        return result;
    }

    async recomputeRootNodesForReveal(): Promise<void> {
        this.lastRootNodes = await this.getRootNodes();
    }

    reorderAfterDrop(
        kind: 'repo' | 'localGroup',
        draggedKey: string,
        targetKey?: string
    ): void {
        if (kind === 'localGroup') {
            const groups = this.getLocalSkillsGroups().filter(g => !g.isActive).map(g => g.path);
            this.localGroupOrder = this.ensureOrder(this.localGroupOrder, groups);
            this.localGroupOrder = this.reorderKey(this.localGroupOrder, draggedKey, targetKey);
            void this.memento?.update('agentskills.localGroupOrder', this.localGroupOrder);
            this._onDidChangeTreeData.fire();
            return;
        }

        const repos = ConfigManager.getRepos().map(r => r.url);
        this.repoOrder = this.ensureOrder(this.repoOrder, repos);
        this.repoOrder = this.reorderKey(this.repoOrder, draggedKey, targetKey);
        void this.memento?.update('agentskills.repoOrder', this.repoOrder);
        this._onDidChangeTreeData.fire();
    }

    private reorderKey(order: string[], draggedKey: string, targetKey?: string): string[] {
        if (draggedKey === targetKey) return order;
        const next = order.filter(k => k !== draggedKey);
        if (!targetKey) {
            next.push(draggedKey);
            return next;
        }
        const index = next.indexOf(targetKey);
        if (index === -1) {
            next.push(draggedKey);
            return next;
        }
        next.splice(index, 0, draggedKey);
        return next;
    }

    moveUp(node: SkillRepo | LocalSkillsGroup): void {
        this.moveNode(node, -1);
    }

    moveDown(node: SkillRepo | LocalSkillsGroup): void {
        this.moveNode(node, 1);
    }

    private moveNode(node: SkillRepo | LocalSkillsGroup, delta: -1 | 1): void {
        if (isLocalSkillsGroup(node)) {
            if (node.isActive) return;
            const key = node.path;
            const groups = this.getLocalSkillsGroups().map(g => g.path);
            this.localGroupOrder = this.ensureOrder(this.localGroupOrder, groups);
            this.localGroupOrder = this.moveKey(this.localGroupOrder, key, delta);
            void this.memento?.update('agentskills.localGroupOrder', this.localGroupOrder);
            this._onDidChangeTreeData.fire();
            return;
        }

        const key = node.url;
        const repos = ConfigManager.getRepos().map(r => r.url);
        this.repoOrder = this.ensureOrder(this.repoOrder, repos);
        this.repoOrder = this.moveKey(this.repoOrder, key, delta);
        void this.memento?.update('agentskills.repoOrder', this.repoOrder);
        this._onDidChangeTreeData.fire();
    }

    private ensureOrder(existing: string[], keys: string[]): string[] {
        const keySet = new Set(keys);
        const normalized = existing.filter(k => keySet.has(k));
        const existingSet = new Set(normalized);
        for (const k of keys) {
            if (!existingSet.has(k)) normalized.push(k);
        }
        return normalized;
    }

    private moveKey(order: string[], key: string, delta: -1 | 1): string[] {
        const next = order.slice();
        const currentIndex = next.indexOf(key);
        if (currentIndex === -1) {
            next.push(key);
            return this.moveKey(next, key, delta);
        }
        const targetIndex = currentIndex + delta;
        if (targetIndex < 0 || targetIndex >= next.length) return next;
        next.splice(currentIndex, 1);
        next.splice(targetIndex, 0, key);
        return next;
    }

    private getSkillKey(skill: Skill): string {
        return `${skill.repoUrl}::${skill.name}`;
    }

    private getWorkspaceRoot(): string | undefined {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }

    private getInstalledSkillsDir(): string | undefined {
        const root = this.getWorkspaceRoot();
        return root ? getProjectSkillsDir(root, detectIde(process.env, vscode.env.appName)) : undefined;
    }

    private isSkillInstalled(skillName: string): boolean {
        const dir = this.getInstalledSkillsDir();
        return dir ? fs.existsSync(path.join(dir, skillName, 'SKILL.md')) : false;
    }

    private updateInstalledSkillHashes(): void {
        this.installedSkillHashes.clear();
        const dir = this.getInstalledSkillsDir();
        if (!dir || !fs.existsSync(dir)) return;

        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && !entry.name.startsWith('.')) {
                    const skillDir = path.join(dir, entry.name);
                    if (fs.existsSync(path.join(skillDir, 'SKILL.md'))) {
                        const hash = getCachedSkillHash(skillDir);
                        this.installedSkillHashes.set(entry.name, hash);
                    }
                }
            }
        } catch (e) {
            console.error('Error updating installed skill hashes:', e);
        }
    }

    private getSkillMatchStatus(skill: Skill): SkillMatchStatus {
        const installedHash = this.installedSkillHashes.get(skill.name);
        if (!installedHash) {
            return SkillMatchStatus.NotInstalled;
        }

        // Compare with repo skill hash
        if (skill.localPath && fs.existsSync(skill.localPath)) {
            const repoHash = getCachedSkillHash(skill.localPath);
            return installedHash === repoHash ? SkillMatchStatus.Matched : SkillMatchStatus.Conflict;
        }

        return SkillMatchStatus.NotInstalled;
    }

    private getLocalSkillsGroups(): LocalSkillsGroup[] {
        const root = this.getWorkspaceRoot();
        if (!root) return [];

        const activeProjectSkillsPath = getProjectSkillsDir(root, detectIde(process.env, vscode.env.appName));

        return getSkillDirectories(root)
            .map(dir => {
                return {
                    type: 'local-group' as const,
                    name: dir.displayName,
                    path: dir.path,
                    icon: dir.icon,
                    exists: fs.existsSync(dir.path),
                    isActive: dir.path === activeProjectSkillsPath
                };
            })
            .filter(group => {
                if (group.isActive) return true;
                if (!group.exists) return false;
                try {
                    const entries = fs.readdirSync(group.path, { withFileTypes: true });
                    return entries.some(entry =>
                        entry.isDirectory() &&
                        !entry.name.startsWith('.') &&
                        fs.existsSync(path.join(group.path, entry.name, 'SKILL.md'))
                    );
                } catch {
                    return false;
                }
            });
    }

    private getLocalSkillsFromGroup(group: LocalSkillsGroup): LocalSkill[] {
        if (!fs.existsSync(group.path)) return [];

        const skills: LocalSkill[] = [];
        try {
            const entries = fs.readdirSync(group.path, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && !entry.name.startsWith('.')) {
                    const skillPath = path.join(group.path, entry.name);
                    const skillMdPath = path.join(skillPath, 'SKILL.md');
                    if (fs.existsSync(skillMdPath)) {
                        const content = fs.readFileSync(skillMdPath, 'utf-8');
                        skills.push({
                            type: 'local-skill',
                            name: entry.name,
                            description: extractYamlField(content, 'description') || '',
                            path: skillPath,
                            groupPath: group.path,
                        });
                    }
                }
            }
        } catch (e) {
            console.error(`Error scanning local skills in ${group.path}:`, e);
        }
        return skills;
    }

    getTreeItem(element: TreeNode): vscode.TreeItem {
        // Local skills group
        if (isLocalSkillsGroup(element)) {
            const item = new vscode.TreeItem(
                element.name,
                vscode.TreeItemCollapsibleState.Collapsed
            );

            item.contextValue = 'localSkillsGroup';
            const root = this.getWorkspaceRoot();
            const isProjectGroup = root && element.path.startsWith(root);
            item.iconPath = element.isActive
                ? new vscode.ThemeIcon('layers-active')
                : isProjectGroup
                    ? new vscode.ThemeIcon('layers')
                    : new vscode.ThemeIcon(element.icon);
            item.tooltip = this.getLocalGroupTooltip(element);
            return item;
        }

        // Local skill
        if (isLocalSkill(element)) {
            const item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.None);

            // Check if this is a project skill or personal directory skill
            const root = this.getWorkspaceRoot();
            const isProjectSkill = root && element.groupPath.startsWith(root);

            if (isProjectSkill) {
                // Project skills: have delete and open buttons
                item.contextValue = 'localSkill';
                item.description = this.truncateDescription(element.description ?? '');
                item.iconPath = new vscode.ThemeIcon('tools');
            } else {
                // Personal directory skills: have install button only (like git skills)
                item.contextValue = 'personalSkill';

                // Check if already installed in project
                const installed = this.isSkillInstalled(element.name);

                const truncatedDesc = element.description.length > 10
                    ? element.description.substring(0, 10) + '...'
                    : element.description;
                item.description = truncatedDesc;

                if (installed) {
                    item.contextValue = 'personalSkillInstalled';
                    item.iconPath = new vscode.ThemeIcon('check');
                } else {
                    item.iconPath = new vscode.ThemeIcon('tools');
                }
            }

            item.tooltip = new vscode.MarkdownString(
                `**${element.name}**\n\n` +
                `${element.description}\n\n` +
                `---\n\n` +
                `📁 ${element.path}`
            );

            return item;
        }

        // Skill repo
        if (isSkillRepo(element)) {
            const item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.Collapsed);
            item.contextValue = 'skillRepo';
            item.description = element.branch ? element.branch : '';
            item.tooltip = this.getRepoTooltip(element);
            item.iconPath = new vscode.ThemeIcon('github');
            return item;
        }

        // Repo skill
        if (isSkill(element)) {
            const matchStatus = element.matchStatus ?? this.getSkillMatchStatus(element);
            const item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.None);
            const key = this.getSkillKey(element);

            // Handle conflict state - skill installed from different repo
            if (matchStatus === SkillMatchStatus.Conflict) {
                item.contextValue = 'skillConflict';
                item.description = this.truncateDescription(element.description ?? '');
                item.tooltip = new vscode.MarkdownString(
                    `**${element.name}**\n\n` +
                    `${element.description}\n\n` +
                    `---\n\n` +
                    `⚠️ **冲突**: 此skill已从其他仓库安装，版本与当前仓库不一致。\n\n` +
                    `如需安装此版本，请先删除已安装的版本。`
                );
                item.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('disabledForeground'));
                // No checkbox for conflicting skills
                return item;
            }

            // Normal installed or not installed state
            const installed = matchStatus === SkillMatchStatus.Matched;

            item.contextValue = installed ? 'skillInstalled' : 'skill';
            item.description = this.truncateDescription(element.description ?? '');
            item.tooltip = `${element.name}\n${element.description}\n${element.path}`;

            let iconName = 'tools';
            if (installed) {
                iconName = 'check';
            }
            item.iconPath = new vscode.ThemeIcon(iconName);

            item.checkboxState = this.checkedSkills.has(key)
                ? vscode.TreeItemCheckboxState.Checked
                : vscode.TreeItemCheckboxState.Unchecked;

            return item;
        }

        // Fallback
        return new vscode.TreeItem('Unknown');
    }

    getParent(element: TreeNode): TreeNode | undefined {
        if (isSkillRepo(element) || isLocalSkillsGroup(element)) return undefined;

        if (isSkill(element)) {
            const repo = this.repoByUrl.get(element.repoUrl);
            if (repo) return repo;
            const fallback = ConfigManager.getRepos().find(r => r.url === element.repoUrl);
            if (fallback) return this.reconcileRepo(fallback);
            return undefined;
        }

        if (isLocalSkill(element)) {
            const group = this.localGroupByPath.get(element.groupPath);
            if (group) return group;
            const fallback = this.getLocalSkillsGroups().find(g => g.path === element.groupPath);
            if (fallback) return this.reconcileLocalGroup(fallback);
            return undefined;
        }

        return undefined;
    }

    async getChildren(element?: TreeNode): Promise<TreeNode[]> {
        if (!element) {
            const nodes = await this.getRootNodes();
            this.lastRootNodes = nodes;
            return nodes;
        }

        // Local skills group children
        if (isLocalSkillsGroup(element)) {
            const skills = this.localSkillsIndex.get(element.path) ?? this.getLocalSkillsFromGroup(element);
            return this.filterSkills(skills);
        }

        // Skill repo children
        if (isSkillRepo(element)) {
            try {
                // Ensure hashes are up to date
                if (this.installedSkillHashes.size === 0) {
                    this.updateInstalledSkillHashes();
                }

                const indexed = this.repoSkillsIndex.get(element.url);
                if (indexed) {
                    return this.filterSkills(indexed);
                }

                if (!GitService.isRepoCloned(element.url)) {
                    const ok = await this.ensureRepoConnectivity(element.url);
                    if (!ok) return [];
                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: `Initializing ${element.name}...`,
                        cancellable: false
                    }, async () => {
                        await GitService.pullRepo(element.url, element.branch);
                    });
                }

                const skills = await GitService.getSkillsFromRepo(element.url, element.branch);
                const normalized = this.normalizeRepoSkills(skills);
                this.repoSkillsIndex.set(element.url, normalized);
                this._onDidChangeTreeData.fire();
                return this.filterSkills(normalized);
            } catch (e) {
                vscode.window.showErrorMessage(`Failed to load skills from ${element.name}: ${e}`);
                return [];
            }
        }

        return [];
    }

    private async buildIndex(): Promise<void> {
        if (this.indexingPromise) return this.indexingPromise;
        this.indexingPromise = this.doBuildIndex().finally(() => {
            this.indexingPromise = undefined;
        });
        return this.indexingPromise;
    }

    private async doBuildIndex(): Promise<void> {
        this.log('Indexing started');
        const localGroups = this.getLocalSkillsGroups();
        this.log(`Local groups: ${localGroups.length}`);
        this.localSkillsIndex.clear();
        for (const group of localGroups) {
            const skills = this.getLocalSkillsFromGroup(group);
            this.localSkillsIndex.set(group.path, skills);
        }

        const repos = await this.getVisibleRepos();
        this.log(`Visible repos: ${repos.length}`);
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Indexing skills...',
            cancellable: false
        }, async (progress) => {
            for (let i = 0; i < repos.length; i++) {
                const repo = repos[i];
                progress.report({ message: `${repo.name} (${i + 1}/${repos.length})` });
                this.log(`Indexing repo: ${repo.url}`);
                try {
                    if (!GitService.isRepoCloned(repo.url)) {
                        await GitService.pullRepo(repo.url, repo.branch);
                    }
                    const skills = await GitService.getSkillsFromRepo(repo.url, repo.branch);
                    this.repoSkillsIndex.set(repo.url, this.normalizeRepoSkills(skills));
                    this.log(`Indexed repo: ${repo.url} (skills: ${skills.length})`);
                } catch (e) {
                    console.error(`Failed to index repo ${repo.url}`, e);
                }
            }
        });

        this.log('Indexing finished');
        this._onDidChangeTreeData.fire();
    }

    private normalizeRepoSkills(skills: Skill[]): Skill[] {
        skills.forEach(s => {
            s.matchStatus = this.getSkillMatchStatus(s);
            s.installed = s.matchStatus === SkillMatchStatus.Matched;
            this.skillCache.set(this.getSkillKey(s), s);
        });
        return skills;
    }

    private filterSkills<T extends Skill | LocalSkill>(skills: T[]): T[] {
        if (!this.searchQuery) return skills;
        const q = this.searchQuery.toLowerCase();
        return skills.filter(s => {
            const name = (s.name ?? '').toLowerCase();
            const desc = ('description' in s ? (s.description ?? '') : '').toLowerCase();
            return name.includes(q) || desc.includes(q);
        });
    }

    private getLocalGroupTotalCount(group: LocalSkillsGroup): number {
        const skills = this.localSkillsIndex.get(group.path);
        if (skills) return skills.length;
        return this.getLocalSkillsFromGroup(group).length;
    }

    private getLocalGroupMatchedCount(group: LocalSkillsGroup): number {
        const skills = this.localSkillsIndex.get(group.path) ?? [];
        return this.filterSkills(skills).length;
    }

    private getRepoTotalCount(repo: SkillRepo): number {
        return this.repoSkillsIndex.get(repo.url)?.length ?? 0;
    }

    private getRepoMatchedCount(repo: SkillRepo): number {
        const skills = this.repoSkillsIndex.get(repo.url) ?? [];
        return this.filterSkills(skills).length;
    }

    private sortLocalGroups(groups: LocalSkillsGroup[]): LocalSkillsGroup[] {
        const orderIndex = new Map(this.localGroupOrder.map((k, i) => [k, i]));
        const originalIndex = new Map(groups.map((g, i) => [g.path, i]));
        return groups.slice().sort((a, b) => {
            if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
            const ai = orderIndex.get(a.path);
            const bi = orderIndex.get(b.path);
            if (ai !== undefined || bi !== undefined) return (ai ?? Number.MAX_SAFE_INTEGER) - (bi ?? Number.MAX_SAFE_INTEGER);
            return (originalIndex.get(a.path) ?? 0) - (originalIndex.get(b.path) ?? 0);
        });
    }

    private sortRepos(repos: SkillRepo[]): SkillRepo[] {
        const orderIndex = new Map(this.repoOrder.map((k, i) => [k, i]));
        const originalIndex = new Map(repos.map((r, i) => [r.url, i]));
        return repos.slice().sort((a, b) => {
            const ai = orderIndex.get(a.url);
            const bi = orderIndex.get(b.url);
            if (ai !== undefined || bi !== undefined) return (ai ?? Number.MAX_SAFE_INTEGER) - (bi ?? Number.MAX_SAFE_INTEGER);
            return (originalIndex.get(a.url) ?? 0) - (originalIndex.get(b.url) ?? 0);
        });
    }

    private async getVisibleRepos(): Promise<SkillRepo[]> {
        const repos = this.sortRepos(ConfigManager.getRepos());
        const checks = await this.mapWithConcurrency(repos, 6, async (repo) => {
            if (GitService.isRepoCloned(repo.url)) return repo;
            const ok = await this.ensureRepoConnectivity(repo.url);
            return ok ? repo : undefined;
        });
        return checks.filter((r): r is SkillRepo => Boolean(r));
    }

    private async ensureRepoConnectivity(url: string): Promise<boolean> {
        const now = Date.now();
        const cached = this.repoConnectivity.get(url);
        if (cached && now - cached.checkedAt < 10 * 60 * 1000) return cached.ok;
        const ok = await GitService.checkRepoConnectivity(url, 200);
        if (!ok) {
            this.warn(`Repo not reachable by DNS, hidden: ${url}`);
        }
        this.repoConnectivity.set(url, { ok, checkedAt: now });
        return ok;
    }

    private log(message: string): void {
        this.outputChannel?.appendLine(`[INFO] ${message}`);
        console.log(message);
    }

    private warn(message: string): void {
        this.outputChannel?.appendLine(`[WARN] ${message}`);
        console.warn(message);
    }

    private async getRootNodes(): Promise<TreeNode[]> {
        const rawLocal = this.getLocalSkillsGroups();
        const localGroups = this.sortLocalGroups(
            rawLocal.map(g => this.reconcileLocalGroup(g))
        );

        const rawRepos = await this.getVisibleRepos();
        const repos = this.sortRepos(
            rawRepos.map(r => this.reconcileRepo(r))
        );

        const rootNodes: TreeNode[] = [];
        const activeLocal = localGroups.filter(g => g.isActive);
        const otherLocal = localGroups.filter(g => !g.isActive);
        rootNodes.push(...activeLocal, ...otherLocal);

        if (this.searchQuery) {
            const filteredLocal = rootNodes.filter(node => {
                if (!isLocalSkillsGroup(node)) return true;
                if (node.isActive) return true;
                return this.getLocalGroupMatchedCount(node) > 0;
            });
            const filteredRepos = repos.filter(r => this.getRepoMatchedCount(r) > 0);
            return filteredLocal.concat(filteredRepos);
        }

        return rootNodes.concat(repos);
    }

    private reconcileLocalGroup(group: LocalSkillsGroup): LocalSkillsGroup {
        const existing = this.localGroupByPath.get(group.path);
        if (existing) {
            Object.assign(existing, group);
            return existing;
        }
        this.localGroupByPath.set(group.path, group);
        return group;
    }

    private reconcileRepo(repo: SkillRepo): SkillRepo {
        const existing = this.repoByUrl.get(repo.url);
        if (existing) {
            Object.assign(existing, repo);
            return existing;
        }
        this.repoByUrl.set(repo.url, repo);
        return repo;
    }

    private truncateDescription(description: string): string {
        const text = description ?? '';
        return text.length > 10 ? text.substring(0, 10) + '...' : text;
    }

    private getRepoTooltip(repo: SkillRepo): vscode.MarkdownString {
        const total = this.getRepoTotalCount(repo);
        const installed = this.getRepoInstalledCount(repo);
        const matched = this.searchQuery ? this.getRepoMatchedCount(repo) : undefined;

        const lines: string[] = [];
        lines.push(`**${repo.name}**`);
        lines.push('');
        lines.push(`[${repo.url}](${repo.url})`);
        lines.push('');
        if (repo.branch) lines.push(`Branch: ${repo.branch}`);
        lines.push(`Total: ${total}`);
        if (matched !== undefined) lines.push(`Matched: ${matched}`);
        lines.push(`Installed: ${installed}`);

        const md = new vscode.MarkdownString(lines.join('\n'));
        md.isTrusted = true;
        return md;
    }

    private getLocalGroupTooltip(group: LocalSkillsGroup): vscode.MarkdownString {
        const total = this.getLocalGroupTotalCount(group);
        const matched = this.searchQuery ? this.getLocalGroupMatchedCount(group) : undefined;

        const lines: string[] = [];
        lines.push(`**${group.name}**`);
        lines.push('');
        lines.push(`[${group.path}](${vscode.Uri.file(group.path)})`);
        lines.push('');
        lines.push(`Total: ${total}`);
        if (matched !== undefined) lines.push(`Matched: ${matched}`);

        const md = new vscode.MarkdownString(lines.join('\n'));
        md.isTrusted = true;
        return md;
    }

    private getRepoInstalledCount(repo: SkillRepo): number {
        const skills = this.repoSkillsIndex.get(repo.url) ?? [];
        return skills.filter(s => {
            const status = s.matchStatus ?? this.getSkillMatchStatus(s);
            return status === SkillMatchStatus.Matched || status === SkillMatchStatus.Conflict;
        }).length;
    }

 

    private async mapWithConcurrency<T, R>(
        items: T[],
        concurrency: number,
        mapper: (item: T) => Promise<R>
    ): Promise<R[]> {
        const results: R[] = new Array(items.length) as R[];
        let nextIndex = 0;

        const worker = async () => {
            while (true) {
                const current = nextIndex++;
                if (current >= items.length) return;
                results[current] = await mapper(items[current]);
            }
        };

        const workers = new Array(Math.min(concurrency, items.length)).fill(0).map(() => worker());
        await Promise.all(workers);
        return results;
    }

    private getAllMatchingRepoSkills(): Skill[] {
        const all: Skill[] = [];
        for (const skills of this.repoSkillsIndex.values()) {
            all.push(...this.filterSkills(skills));
        }
        return all;
    }
}
