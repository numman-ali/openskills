import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as https from 'https';
import AdmZip = require('adm-zip');
import { SkillsProvider } from './skillsProvider';
import { ConfigManager } from './configManager';
import { GitService } from './services/git';
import { Skill, SkillRepo, LocalSkill, LocalSkillsGroup } from './types';
import { copyRecursiveSync } from './utils/fs';
import { detectIde, getProjectSkillsDir } from './utils/ide';

type TreeNode = SkillRepo | Skill | LocalSkillsGroup | LocalSkill;
let skillsTreeView: vscode.TreeView<TreeNode>;

interface RemoteSkill {
    id: string;
    name: string;
    namespace: string;
    sourceUrl: string;
    description: string;
    author: string;
    installs: number;
    stars: number;
}

interface RemoteSkillsResponse {
    skills: RemoteSkill[];
    total: number;
    limit: number;
    offset: number;
}

type RemoteSkillPickItem = vscode.QuickPickItem & { itemType: 'remoteSkill'; skill: RemoteSkill; installed: boolean };

export function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel('Agent Skills Manager');
    context.subscriptions.push(outputChannel);

    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalDebug = console.debug;

    console.log = (...args: any[]) => {
        const message = args.map(arg => String(arg)).join(' ');
        outputChannel.appendLine(`[INFO] ${message}`);
        originalLog.apply(console, args);
    };

    console.info = (...args: any[]) => {
        const message = args.map(arg => String(arg)).join(' ');
        outputChannel.appendLine(`[INFO] ${message}`);
        originalInfo.apply(console, args);
    };

    console.warn = (...args: any[]) => {
        const message = args.map(arg => String(arg)).join(' ');
        outputChannel.appendLine(`[WARN] ${message}`);
        originalWarn.apply(console, args);
    };

    console.error = (...args: any[]) => {
        const message = args.map(arg => String(arg)).join(' ');
        outputChannel.appendLine(`[ERROR] ${message}`);
        originalError.apply(console, args);
    };

    console.debug = (...args: any[]) => {
        const message = args.map(arg => String(arg)).join(' ');
        outputChannel.appendLine(`[DEBUG] ${message}`);
        originalDebug.apply(console, args);
    };

    outputChannel.appendLine('[INFO] Agent Skills Manager extension activated');
    outputChannel.appendLine(`[INFO] IDE detect hint (vscode.env.appName): ${vscode.env.appName}`);
    outputChannel.appendLine(`[INFO] ENV AGENTSKILLS_IDE=${process.env.AGENTSKILLS_IDE ?? ''}`);
    outputChannel.appendLine(`[INFO] ENV VSCODE_BRAND=${process.env.VSCODE_BRAND ?? ''}`);
    outputChannel.appendLine(`[INFO] ENV VSCODE_ENV_APPNAME=${process.env.VSCODE_ENV_APPNAME ?? ''}`);
    outputChannel.appendLine(`[INFO] ENV PROG_IDE_NAME=${process.env.PROG_IDE_NAME ?? ''}`);

    outputChannel.appendLine('[INFO] Creating SkillsProvider');
    const skillsProvider = new SkillsProvider(context.globalState, outputChannel);

    const dragMimeType = 'application/vnd.agentskills.node';
    const dragAndDropController: vscode.TreeDragAndDropController<TreeNode> = {
        dragMimeTypes: [dragMimeType],
        dropMimeTypes: [dragMimeType],
        handleDrag: (source, dataTransfer, _token) => {
            const first = source[0];
            if (!first) return;

            if ('type' in first && first.type === 'local-group') {
                const group = first as LocalSkillsGroup;
                if (group.isActive) return;
                dataTransfer.set(dragMimeType, new vscode.DataTransferItem(JSON.stringify({
                    kind: 'localGroup',
                    key: group.path
                })));
                return;
            }

            if ('url' in first) {
                const repo = first as SkillRepo;
                dataTransfer.set(dragMimeType, new vscode.DataTransferItem(JSON.stringify({
                    kind: 'repo',
                    key: repo.url
                })));
            }
        },
        handleDrop: (_target, dataTransfer, _token) => {
            const item = dataTransfer.get(dragMimeType);
            const raw = item?.value;
            if (typeof raw !== 'string') return;

            const parsed = JSON.parse(raw) as { kind: 'repo' | 'localGroup'; key: string };
            const target = _target as any | undefined;

            if (parsed.kind === 'repo') {
                const targetKey = target && ('url' in target) ? String(target.url) : undefined;
                skillsProvider.reorderAfterDrop('repo', parsed.key, targetKey);
                return;
            }

            if (parsed.kind === 'localGroup') {
                const isTargetGroup = target && target.type === 'local-group';
                const targetKey = isTargetGroup && !target.isActive ? String(target.path) : undefined;
                skillsProvider.reorderAfterDrop('localGroup', parsed.key, targetKey);
            }
        }
    };

    skillsTreeView = vscode.window.createTreeView('agentskills-skills', {
        treeDataProvider: skillsProvider,
        canSelectMany: true,
        dragAndDropController
    });

    context.subscriptions.push(skillsTreeView);
    outputChannel.appendLine('[INFO] Skills TreeView created');
    outputChannel.appendLine('[INFO] Starting initial refresh/indexing');
    skillsProvider.refresh();

    const updateSearchUi = (query: string) => {
        skillsTreeView.message = query ? `Filter: ${query}` : undefined;
        void vscode.commands.executeCommand('setContext', 'agentskills.hasFilter', Boolean(query));
    };

    updateSearchUi(skillsProvider.getSearchQuery());
    context.subscriptions.push(skillsProvider.onDidChangeSearchQuery(updateSearchUi));

    skillsTreeView.onDidChangeCheckboxState(e => {
        e.items.forEach(([item, state]) => {
            // Only handle repo skills (have repoUrl, not local skills)
            if ('repoUrl' in item) {
                skillsProvider.setChecked(item as Skill, state === vscode.TreeItemCheckboxState.Checked);
            }
        });
    });

    context.subscriptions.push(
        vscode.commands.registerCommand('agentskills.refresh', () => skillsProvider.refresh()),
        vscode.commands.registerCommand('agentskills.search', async () => {
            const installButton: vscode.QuickInputButton = {
                iconPath: new vscode.ThemeIcon('cloud-download'),
                tooltip: 'Install'
            };
            const prevPageButton: vscode.QuickInputButton = {
                iconPath: new vscode.ThemeIcon('arrow-left'),
                tooltip: 'Previous page'
            };
            const nextPageButton: vscode.QuickInputButton = {
                iconPath: new vscode.ThemeIcon('arrow-right'),
                tooltip: 'Next page'
            };
            const openSiteButton: vscode.QuickInputButton = {
                iconPath: new vscode.ThemeIcon('link-external'),
                tooltip: 'Open https://claude-plugins.dev/'
            };

            const quickPick = vscode.window.createQuickPick<RemoteSkillPickItem>();
            quickPick.title = 'Search Skills';
            quickPick.placeholder = 'Search skills by name or description';
            quickPick.matchOnDescription = true;
            quickPick.matchOnDetail = true;
            quickPick.value = skillsProvider.getSearchQuery();

            let debounceTimer: NodeJS.Timeout | undefined;
            let activeRequest = 0;

            let query = quickPick.value.trim();
            let offset = 0;
            const limit = 20;
            let total = 0;

            const getTargetBase = (): string | undefined => {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!workspaceRoot) return undefined;
                return getProjectSkillsDir(workspaceRoot, detectIde(process.env, vscode.env.appName));
            };

            const updateButtons = () => {
                const buttons: vscode.QuickInputButton[] = [];
                buttons.push(openSiteButton);
                if (offset > 0) buttons.push(prevPageButton);
                if (offset + limit < total) buttons.push(nextPageButton);
                quickPick.buttons = buttons;
            };

            const updateTitle = () => {
                const start = total === 0 ? 0 : offset + 1;
                const end = Math.min(offset + limit, total);
                quickPick.title = `Search Skills — ${start}-${end} / ${total}`;
            };

            const makeItem = (skill: RemoteSkill, targetBase: string | undefined): RemoteSkillPickItem => {
                const safeName = sanitizeDirName(skill.name);
                const installed = Boolean(targetBase && fs.existsSync(path.join(targetBase, safeName)));
                const installsText = formatCompactNumber(skill.installs);
                const starsText = formatCompactNumber(skill.stars);

                return {
                    itemType: 'remoteSkill',
                    skill,
                    installed,
                    label: skill.name,
                    description: `${starsText} ★  ${installsText} ⬇`,
                    detail: [skill.namespace, skill.author ? `by ${skill.author}` : '', skill.description].filter(Boolean).join(' — '),
                    buttons: installed ? [] : [installButton]
                };
            };

            const refreshRemote = async (nextQuery: string, nextOffset: number) => {
                const requestId = ++activeRequest;
                const trimmed = nextQuery.trim();

                query = trimmed;
                offset = nextOffset;
                quickPick.items = [];
                quickPick.busy = true;
                quickPick.title = 'Search Skills — Loading...';

                try {
                    const result = await fetchRemoteSkills(trimmed, limit, nextOffset);
                    if (requestId !== activeRequest) return;

                    offset = result.offset;
                    total = result.total;

                    const targetBase = getTargetBase();
                    quickPick.items = result.skills.map(s => makeItem(s, targetBase));
                    quickPick.activeItems = [];
                    quickPick.selectedItems = [];
                    updateTitle();
                    updateButtons();
                } catch (e) {
                    if (requestId !== activeRequest) return;
                    quickPick.items = [];
                    total = 0;
                    offset = 0;
                    updateTitle();
                    updateButtons();
                    console.warn(`Remote search failed: ${e}`);
                } finally {
                    if (requestId === activeRequest) quickPick.busy = false;
                }
            };

            const scheduleRefresh = (nextQuery: string) => {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    skillsProvider.setSearchQuery(nextQuery);
                    void refreshRemote(nextQuery, 0);
                }, 500);
            };

            quickPick.onDidChangeValue(value => {
                offset = 0;
                scheduleRefresh(value);
            });

            quickPick.onDidTriggerButton(button => {
                if (button === openSiteButton) {
                    void vscode.env.openExternal(vscode.Uri.parse('https://claude-plugins.dev/'));
                    return;
                }
                if (button === prevPageButton) {
                    const nextOffset = Math.max(0, offset - limit);
                    void refreshRemote(query, nextOffset);
                    return;
                }
                if (button === nextPageButton) {
                    const nextOffset = offset + limit;
                    void refreshRemote(query, nextOffset);
                }
            });

            quickPick.onDidTriggerItemButton(async e => {
                if (e.button !== installButton) return;

                const item = e.item;
                if (!vscode.workspace.workspaceFolders?.[0]) {
                    vscode.window.showErrorMessage('Please open a workspace folder first.');
                    return;
                }

                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: `Installing ${item.skill.name}...`,
                    cancellable: false
                }, async () => {
                    await installRemoteSkillFromZip(item.skill, getTargetBase()!);
                });

                skillsProvider.refreshInstalledAndLocal();
                void refreshRemote(query, offset);
                vscode.window.showInformationMessage(`Installed skill "${item.skill.name}".`);
            });

            quickPick.onDidAccept(async () => {
                const selected = (quickPick.selectedItems[0] ?? quickPick.activeItems[0]) as RemoteSkillPickItem | undefined;
                if (selected?.itemType === 'remoteSkill') {
                    if (!vscode.workspace.workspaceFolders?.[0]) {
                        vscode.window.showErrorMessage('Please open a workspace folder first.');
                        return;
                    }

                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: `Installing ${selected.skill.name}...`,
                        cancellable: false
                    }, async () => {
                        await installRemoteSkillFromZip(selected.skill, getTargetBase()!);
                    });

                    skillsProvider.refreshInstalledAndLocal();
                    void refreshRemote(query, offset);
                    vscode.window.showInformationMessage(`Installed skill "${selected.skill.name}".`);
                    quickPick.hide();
                    return;
                }

                const acceptedQuery = quickPick.value;
                if (!acceptedQuery.trim()) {
                    quickPick.hide();
                    return;
                }

                skillsProvider.setSearchQuery(acceptedQuery);
                await skillsProvider.waitForIndexing();
                await skillsProvider.recomputeRootNodesForReveal();
                await vscode.commands.executeCommand('workbench.actions.treeView.agentskills-skills.collapseAll');
                for (const node of skillsProvider.getExpandableRootsForSearch()) {
                    await skillsTreeView.reveal(node as any, { expand: true, select: false, focus: false });
                }
                quickPick.hide();
            });

            quickPick.onDidHide(() => {
                if (debounceTimer) clearTimeout(debounceTimer);
                activeRequest++;
                quickPick.dispose();
            });

            quickPick.show();
            void refreshRemote(quickPick.value, 0);
        }),
        vscode.commands.registerCommand('agentskills.clearSearch', () => {
            skillsProvider.setSearchQuery('');
            void vscode.commands.executeCommand('workbench.actions.treeView.agentskills-skills.collapseAll');
        }),
        vscode.commands.registerCommand('agentskills.selectAllInRepo', async (node: SkillRepo) => {
            if (!node || !('url' in node)) return;
            await skillsProvider.waitForIndexing();
            skillsProvider.checkAllSkillsInRepo(node);
        }),
        vscode.commands.registerCommand('agentskills.clearInRepo', async (node: SkillRepo) => {
            if (!node || !('url' in node)) return;
            await skillsProvider.waitForIndexing();
            skillsProvider.clearCheckedSkillsInRepo(node);
        }),

        vscode.commands.registerCommand('agentskills.addRepo', async () => {
            const url = await vscode.window.showInputBox({
                placeHolder: 'Enter Git Repository URL (e.g., https://github.com/anthropics/skills)',
                prompt: 'Add a new Skill Repository'
            });
            if (url) {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Adding repository...',
                    cancellable: false
                }, async () => {
                    await ConfigManager.addRepo(url);
                    skillsProvider.refresh();
                });
            }
        }),

        vscode.commands.registerCommand('agentskills.removeRepo', async (node: SkillRepo) => {
            const result = await vscode.window.showWarningMessage(`Remove repository ${node.name}?`, 'Yes', 'No');
            if (result === 'Yes') {
                await ConfigManager.removeRepo(node.url);
                skillsProvider.refresh();
            }
        }),

        vscode.commands.registerCommand('agentskills.switchBranch', async (node: SkillRepo) => {
            const branches = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Fetching branches...',
                cancellable: false
            }, async () => {
                return await GitService.getRemoteBranches(node.url);
            });

            if (branches.length === 0) {
                vscode.window.showErrorMessage('Could not list branches or no branches found.');
                return;
            }

            const selected = await vscode.window.showQuickPick(branches, {
                placeHolder: `Select branch for ${node.name} (current: ${node.branch || 'default'})`
            });

            if (selected) {
                await ConfigManager.updateRepo(node.url, { branch: selected });
                skillsProvider.refresh();
            }
        }),

        vscode.commands.registerCommand('agentskills.pullRepo', async (node: SkillRepo) => {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Pulling ${node.name}...`,
                cancellable: false
            }, async () => {
                await GitService.pullRepo(node.url, node.branch);
            });
            skillsProvider.refresh();
            vscode.window.showInformationMessage(`${node.name} updated.`);
        }),

        vscode.commands.registerCommand('agentskills.installSelected', async () => {
            const checked = skillsProvider.getCheckedSkills();
            const selected = checked.length > 0
                ? checked
                : (skillsTreeView.selection.filter(item => !('url' in item)) as Skill[]);

            if (selected.length === 0) {
                vscode.window.showWarningMessage('Please select skills to install (use checkboxes).');
                return;
            }

            if (!vscode.workspace.workspaceFolders) {
                vscode.window.showErrorMessage('Please open a workspace folder first.');
                return;
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Installing ${selected.length} skill(s)...`,
                cancellable: false
            }, async (progress) => {
                const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
                const targetBase = getProjectSkillsDir(workspaceRoot, detectIde(process.env, vscode.env.appName));

                for (let i = 0; i < selected.length; i++) {
                    const skill = selected[i];
                    progress.report({ message: `${skill.name} (${i + 1}/${selected.length})` });

                    const targetDir = path.join(targetBase, skill.name);

                    if (!skill.localPath || !fs.existsSync(skill.localPath)) {
                        vscode.window.showWarningMessage(`Source files missing for ${skill.name}. Try refreshing.`);
                        continue;
                    }

                    fs.mkdirSync(path.dirname(targetDir), { recursive: true });
                    copyRecursiveSync(skill.localPath, targetDir);
                }
            });

            skillsProvider.clearSelection();
            skillsProvider.refreshInstalledAndLocal();
            vscode.window.showInformationMessage(`Installed ${selected.length} skill(s).`);
        }),

        vscode.commands.registerCommand('agentskills.deleteSelected', async () => {
            const checked = skillsProvider.getCheckedSkills();
            const selected = checked.length > 0
                ? checked
                : (skillsTreeView.selection.filter(item => !('url' in item)) as Skill[]);

            if (selected.length === 0) {
                vscode.window.showWarningMessage('Please select skills to delete.');
                return;
            }

            if (!vscode.workspace.workspaceFolders) {
                vscode.window.showErrorMessage('Please open a workspace folder first.');
                return;
            }

            const confirm = await vscode.window.showWarningMessage(
                `Delete ${selected.length} skill(s) from this project?`,
                'Yes', 'No'
            );

            if (confirm !== 'Yes') return;

            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
            const targetBase = getProjectSkillsDir(workspaceRoot, detectIde(process.env, vscode.env.appName));

            for (const skill of selected) {
                const targetDir = path.join(targetBase, skill.name);
                if (fs.existsSync(targetDir)) {
                    fs.rmSync(targetDir, { recursive: true, force: true });
                }
            }

            skillsProvider.clearSelection();
            skillsProvider.refreshInstalledAndLocal();
            vscode.window.showInformationMessage(`Deleted ${selected.length} skill(s).`);
        }),

        vscode.commands.registerCommand('agentskills.installSkill', async (node: Skill) => {
            if (!node || !('repoUrl' in node)) {
                vscode.window.showErrorMessage('Please select a skill to install.');
                return;
            }

            if (!vscode.workspace.workspaceFolders) {
                vscode.window.showErrorMessage('Please open a workspace folder first.');
                return;
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Installing ${node.name}...`,
                cancellable: false
            }, async () => {
                const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
                const targetBase = getProjectSkillsDir(workspaceRoot, detectIde(process.env, vscode.env.appName));
                const targetDir = path.join(targetBase, node.name);

                if (!node.localPath || !fs.existsSync(node.localPath)) {
                    vscode.window.showWarningMessage(`Source files missing for ${node.name}. Try refreshing.`);
                    return;
                }

                fs.mkdirSync(path.dirname(targetDir), { recursive: true });
                copyRecursiveSync(node.localPath, targetDir);
            });

            skillsProvider.clearSelection();
            skillsProvider.refreshInstalledAndLocal();
            vscode.window.showInformationMessage(`Installed skill "${node.name}".`);
        }),

        vscode.commands.registerCommand('agentskills.deleteSkill', async (node: Skill) => {
            if (!node || !('repoUrl' in node)) {
                vscode.window.showErrorMessage('Please select a skill to delete.');
                return;
            }

            if (!vscode.workspace.workspaceFolders) {
                vscode.window.showErrorMessage('Please open a workspace folder first.');
                return;
            }

            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
            const targetBase = getProjectSkillsDir(workspaceRoot, detectIde(process.env, vscode.env.appName));
            const targetDir = path.join(targetBase, node.name);

            if (fs.existsSync(targetDir)) {
                fs.rmSync(targetDir, { recursive: true, force: true });
            }

            skillsProvider.clearSelection();
            skillsProvider.refreshInstalledAndLocal();
            vscode.window.showInformationMessage(`Deleted skill "${node.name}".`);
        }),

        vscode.commands.registerCommand('agentskills.deleteLocalSkill', async (node: LocalSkill) => {
            if (!node || node.type !== 'local-skill') {
                vscode.window.showErrorMessage('Please select a local skill to delete.');
                return;
            }

            try {
                if (fs.existsSync(node.path)) {
                    fs.rmSync(node.path, { recursive: true, force: true });
                }
                skillsProvider.clearSelection();
                skillsProvider.refreshInstalledAndLocal();
                vscode.window.showInformationMessage(`Deleted skill "${node.name}".`);
            } catch (e) {
                vscode.window.showErrorMessage(`Failed to delete skill: ${e}`);
            }
        }),

        vscode.commands.registerCommand('agentskills.openLocalSkill', async (node: LocalSkill) => {
            if (!node || node.type !== 'local-skill') return;

            const skillMdPath = path.join(node.path, 'SKILL.md');
            if (fs.existsSync(skillMdPath)) {
                const doc = await vscode.workspace.openTextDocument(skillMdPath);
                await vscode.window.showTextDocument(doc);
            }
        }),

        vscode.commands.registerCommand('agentskills.installPersonalSkill', async (node: LocalSkill) => {
            if (!node || node.type !== 'local-skill') {
                vscode.window.showErrorMessage('Please select a skill to install.');
                return;
            }

            if (!vscode.workspace.workspaceFolders) {
                vscode.window.showErrorMessage('Please open a workspace folder first.');
                return;
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Installing ${node.name}...`,
                cancellable: false
            }, async () => {
                const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
                const targetBase = getProjectSkillsDir(workspaceRoot, detectIde(process.env, vscode.env.appName));
                const targetDir = path.join(targetBase, node.name);

                if (!fs.existsSync(node.path)) {
                    vscode.window.showWarningMessage(`Source files missing for ${node.name}.`);
                    return;
                }

                fs.mkdirSync(path.dirname(targetDir), { recursive: true });
                copyRecursiveSync(node.path, targetDir);
            });

            skillsProvider.clearSelection();
            skillsProvider.refreshInstalledAndLocal();
            vscode.window.showInformationMessage(`Installed skill "${node.name}".`);
        })
    );

    // Show the view on first load or update to help user find the extension
    const extensionId = 'whyuds.agent-skills-manager';
    const extension = vscode.extensions.getExtension(extensionId);
    const currentVersion = extension?.packageJSON.version;
    const lastVersion = context.globalState.get<string>('agentskills.lastShownVersion');

    if (currentVersion && currentVersion !== lastVersion) {
        // Delay slightly to ensure UI is ready
        setTimeout(() => {
            vscode.commands.executeCommand('workbench.view.extension.agentskills-explorer');
        }, 1000);
        context.globalState.update('agentskills.lastShownVersion', currentVersion);
    }

}

export function deactivate() { }

function formatCompactNumber(value: number): string {
    if (!Number.isFinite(value)) return '0';
    const abs = Math.abs(value);
    if (abs < 1000) return String(Math.trunc(value));
    if (abs < 1_000_000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    if (abs < 1_000_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
    return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}b`;
}

function sanitizeDirName(name: string): string {
    const cleaned = name.replace(/[\\/:*"<>|?]+/g, '-').trim();
    return cleaned || 'skill';
}

function downloadUrlToBuffer(url: string, headers: Record<string, string> | undefined, redirectsLeft = 3): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const request = https.get(url, { headers }, res => {
            const status = res.statusCode ?? 0;
            const location = res.headers.location;
            if ([301, 302, 303, 307, 308].includes(status) && location && redirectsLeft > 0) {
                res.resume();
                const redirected = new URL(location, url).toString();
                void downloadUrlToBuffer(redirected, headers, redirectsLeft - 1).then(resolve, reject);
                return;
            }

            if (status < 200 || status >= 300) {
                const chunks: Buffer[] = [];
                res.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
                res.on('end', () => {
                    const body = Buffer.concat(chunks).toString('utf8');
                    reject(new Error(`Request failed (${status}): ${body.slice(0, 300)}`));
                });
                return;
            }

            const chunks: Buffer[] = [];
            res.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        });
        request.on('error', reject);
    });
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchRemoteSkills(q: string, limit: number, offset: number): Promise<RemoteSkillsResponse> {
    const url = new URL('https://claude-plugins.dev/api/skills');
    const trimmed = q.trim();
    if (trimmed) {
        url.searchParams.set('q', trimmed);
    }
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));

    const headers = {
        Accept: 'application/json',
        'User-Agent': 'claude-plugins-web/1.0'
    };

    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const buf = await downloadUrlToBuffer(url.toString(), headers);
            const parsed = JSON.parse(buf.toString('utf8')) as RemoteSkillsResponse;
            if (!parsed || !Array.isArray(parsed.skills)) {
                throw new Error('Invalid response');
            }
            return parsed;
        } catch (e) {
            lastError = e;
            if (attempt < 3) {
                console.debug(`Remote search retry ${attempt}/2: ${e}`);
                await sleep(attempt === 1 ? 200 : 500);
                continue;
            }
        }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function findDirsWithFile(rootDir: string, fileName: string, maxDepth: number): string[] {
    const results: string[] = [];

    const visit = (dir: string, depth: number) => {
        if (depth > maxDepth) return;
        const candidate = path.join(dir, fileName);
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            results.push(dir);
        }

        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            if (entry.name === '.git' || entry.name === 'node_modules') continue;
            visit(path.join(dir, entry.name), depth + 1);
        }
    };

    visit(rootDir, 0);
    return results;
}

function pickSkillRoot(extractedDir: string, expectedName: string): string {
    const candidates = findDirsWithFile(extractedDir, 'SKILL.md', 4);
    if (candidates.length === 0) return extractedDir;

    const expectedLower = expectedName.toLowerCase();
    const best = candidates.find(d => path.basename(d).toLowerCase() === expectedLower);
    return best ?? candidates[0]!;
}

async function installRemoteSkillFromZip(skill: RemoteSkill, targetBase: string): Promise<void> {
    const safeName = sanitizeDirName(skill.name);
    const targetDir = path.join(targetBase, safeName);

    const zipUrl = new URL('https://github-zip-api.val.run/zip');
    zipUrl.searchParams.set('source', skill.sourceUrl);

    const buf = await downloadUrlToBuffer(zipUrl.toString(), undefined);

    const tempDir = path.join(os.tmpdir(), `agentskills-zip-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const extractDir = path.join(tempDir, 'extract');
    fs.mkdirSync(extractDir, { recursive: true });

    try {
        const zip = new AdmZip(buf);
        zip.extractAllTo(extractDir, true);

        const selectedRoot = pickSkillRoot(extractDir, safeName);

        fs.mkdirSync(path.dirname(targetDir), { recursive: true });
        if (fs.existsSync(targetDir)) {
            fs.rmSync(targetDir, { recursive: true, force: true });
        }

        copyRecursiveSync(selectedRoot, targetDir);
    } finally {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    }
}
