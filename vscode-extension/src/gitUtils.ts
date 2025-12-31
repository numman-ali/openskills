import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Skill } from './types';

const CACHE_DIR = path.join(os.tmpdir(), 'openskills-vscode-cache');

if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function extractYamlField(content: string, field: string): string {
    const match = content.match(new RegExp(`^${field}:\\s*(.+?)$`, 'm'));
    return match ? match[1].trim() : '';
}

function hasValidFrontmatter(content: string): boolean {
    return content.trim().startsWith('---');
}

export class GitUtils {
    static getRepoPath(url: string): string {
        const dirName = Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
        return path.join(CACHE_DIR, dirName);
    }

    static isRepoCloned(url: string): boolean {
        const repoPath = this.getRepoPath(url);
        return fs.existsSync(path.join(repoPath, '.git'));
    }

    static async getRemoteBranches(url: string): Promise<string[]> {
        try {
            const output = await this.execGitOutput(['ls-remote', '--heads', url]);
            return output.split('\n')
                .filter(line => line.trim())
                .map(line => {
                    const parts = line.split('\t');
                    return parts[1].replace('refs/heads/', '');
                });
        } catch (e) {
            console.error(`Failed to list branches for ${url}`, e);
            return [];
        }
    }

    // Only clone if not exists, no pull
    static async ensureRepoCloned(url: string, branch?: string): Promise<string> {
        const repoPath = this.getRepoPath(url);

        if (!fs.existsSync(path.join(repoPath, '.git'))) {
            if (fs.existsSync(repoPath)) {
                fs.rmSync(repoPath, { recursive: true, force: true });
            }
            const dirName = path.basename(repoPath);
            const args = ['clone', '--depth', '1', url, dirName];
            if (branch) {
                args.push('--branch', branch);
            }
            await this.execGitSilent(CACHE_DIR, args);
        }
        return repoPath;
    }

    // Explicit pull operation
    static async pullRepo(url: string, branch?: string): Promise<void> {
        const repoPath = this.getRepoPath(url);

        if (!fs.existsSync(path.join(repoPath, '.git'))) {
            await this.ensureRepoCloned(url, branch);
            return;
        }

        await this.execGitSilent(repoPath, ['fetch', 'origin']);
        if (branch) {
            await this.execGitSilent(repoPath, ['checkout', branch]);
            await this.execGitSilent(repoPath, ['pull', 'origin', branch]);
        } else {
            await this.execGitSilent(repoPath, ['pull']);
        }
    }

    // Scan skills from local cache only
    static scanSkillsFromCache(url: string): Skill[] {
        const repoPath = this.getRepoPath(url);
        const skills: Skill[] = [];

        if (!fs.existsSync(repoPath)) {
            return skills;
        }

        const findSkills = (dir: string) => {
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.name.startsWith('.')) continue;

                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        if (fs.existsSync(path.join(fullPath, 'SKILL.md'))) {
                            const content = fs.readFileSync(path.join(fullPath, 'SKILL.md'), 'utf-8');
                            if (hasValidFrontmatter(content)) {
                                skills.push({
                                    name: extractYamlField(content, 'name') || entry.name,
                                    description: extractYamlField(content, 'description'),
                                    path: path.relative(repoPath, fullPath).replace(/\\/g, '/'),
                                    repoUrl: url,
                                    localPath: fullPath
                                });
                            }
                        } else {
                            findSkills(fullPath);
                        }
                    }
                }
            } catch (e) {
                console.error(`Error scanning dir ${dir}`, e);
            }
        };

        findSkills(repoPath);
        return skills;
    }

    // Clone if needed, then scan (for initial load)
    static async getSkillsFromRepo(url: string, branch?: string): Promise<Skill[]> {
        await this.ensureRepoCloned(url, branch);
        return this.scanSkillsFromCache(url);
    }

    private static execGitOutput(args: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            cp.execFile('git', args, {
                windowsHide: true
            }, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`Git command failed: ${stderr || error.message}`));
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    private static execGitSilent(cwd: string, args: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            cp.execFile('git', args, {
                cwd,
                windowsHide: true
            }, (error, _stdout, stderr) => {
                if (error) {
                    reject(new Error(`Git command failed: ${stderr || error.message}`));
                } else {
                    resolve();
                }
            });
        });
    }
}
