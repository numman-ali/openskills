import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import { SkillsProvider } from './skillsProvider';
import { ConfigManager } from './configManager';
import { GitUtils } from './gitUtils';
import { Skill, SkillRepo } from './types';

let skillsTreeView: vscode.TreeView<SkillRepo | Skill>;

export function activate(context: vscode.ExtensionContext) {
    const skillsProvider = new SkillsProvider();

    // Create Output Channel
    const outputChannel = vscode.window.createOutputChannel('OpenSkills');

    // Patch console to redirect to Output Channel
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args: any[]) => {
        const message = args.map(arg => String(arg)).join(' ');
        outputChannel.appendLine(`[INFO] ${message}`);
        originalLog.apply(console, args);
    };

    console.error = (...args: any[]) => {
        const message = args.map(arg => String(arg)).join(' ');
        outputChannel.appendLine(`[ERROR] ${message}`);
        originalError.apply(console, args);
    };

    outputChannel.appendLine('OpenSkills extension activated');

    skillsTreeView = vscode.window.createTreeView('openskills-skills', {
        treeDataProvider: skillsProvider,
        canSelectMany: true
    });

    context.subscriptions.push(skillsTreeView);

    skillsTreeView.onDidChangeCheckboxState(e => {
        e.items.forEach(([item, state]) => {
            if (!('url' in item)) {
                skillsProvider.setChecked(item as Skill, state === vscode.TreeItemCheckboxState.Checked);
            }
        });
    });

    context.subscriptions.push(
        vscode.commands.registerCommand('openskills.refresh', () => skillsProvider.refresh()),

        vscode.commands.registerCommand('openskills.addRepo', async () => {
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

        vscode.commands.registerCommand('openskills.removeRepo', async (node: SkillRepo) => {
            const result = await vscode.window.showWarningMessage(`Remove repository ${node.name}?`, 'Yes', 'No');
            if (result === 'Yes') {
                await ConfigManager.removeRepo(node.url);
                skillsProvider.refresh();
            }
        }),

        vscode.commands.registerCommand('openskills.switchBranch', async (node: SkillRepo) => {
            const branches = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Fetching branches...',
                cancellable: false
            }, async () => {
                return await GitUtils.getRemoteBranches(node.url);
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

        vscode.commands.registerCommand('openskills.pullRepo', async (node: SkillRepo) => {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Pulling ${node.name}...`,
                cancellable: false
            }, async () => {
                await GitUtils.pullRepo(node.url, node.branch);
            });
            skillsProvider.refresh();
            vscode.window.showInformationMessage(`${node.name} updated.`);
        }),

        vscode.commands.registerCommand('openskills.sync', async () => {
            if (!vscode.workspace.workspaceFolders) {
                vscode.window.showErrorMessage('Please open a workspace folder first.');
                return;
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Syncing to AGENTS.md...',
                cancellable: false
            }, async () => {
                outputChannel.show();
                console.log(`Starting sync process... IDE: ${vscode.env.appName}`);
                const { syncToAgentsMd } = await import('./syncUtils');
                const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
                const result = syncToAgentsMd(workspaceRoot, vscode.env.appName);

                if (result.success) {
                    vscode.window.showInformationMessage(result.message);
                } else {
                    vscode.window.showErrorMessage(result.message);
                }
            });
        }),

        vscode.commands.registerCommand('openskills.installSelected', async () => {
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
                const targetBase = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, '.agent', 'skills');

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

            skillsProvider.refresh();

            const syncNow = await vscode.window.showInformationMessage(
                `Installed ${selected.length} skill(s). Sync AGENTS.md now?`,
                'Yes', 'No'
            );
            if (syncNow === 'Yes') {
                vscode.commands.executeCommand('openskills.sync');
            }
        }),

        vscode.commands.registerCommand('openskills.deleteSelected', async () => {
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

            const targetBase = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.agent', 'skills');

            for (const skill of selected) {
                const targetDir = path.join(targetBase, skill.name);
                if (fs.existsSync(targetDir)) {
                    fs.rmSync(targetDir, { recursive: true, force: true });
                }
            }

            skillsProvider.refresh();
            vscode.window.showInformationMessage(`Deleted ${selected.length} skill(s).`);
        })
    );
}

function copyRecursiveSync(src: string, dest: string) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = stats && stats.isDirectory();
    if (isDirectory) {
        if (fs.existsSync(dest)) {
            fs.rmSync(dest, { recursive: true, force: true });
        }
        fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

export function deactivate() {
    // Restore console? (Optional, as extension host is dying anyway)
}
