import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as dns from 'dns';
import { Skill } from '../types';
import { scanSkillsFromDir, getRepoCachePath } from './skillScanner';

const CACHE_DIR = path.join(os.tmpdir(), 'agentskills-git-cache');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export class GitService {
    static getRepoPath(url: string): string {
        return getRepoCachePath(url);
    }

    static isRepoCloned(url: string): boolean {
        const repoPath = this.getRepoPath(url);
        return fs.existsSync(path.join(repoPath, '.git'));
    }

    private static async isValidGitRepo(repoPath: string): Promise<boolean> {
        try {
            const output = await this.execGitOutputInDir(repoPath, ['rev-parse', '--is-inside-work-tree']);
            return output.trim() === 'true';
        } catch {
            return false;
        }
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

    static async checkRepoConnectivity(url: string, timeoutMs: number = 200): Promise<boolean> {
        const host = this.getRepoHost(url);
        if (!host) return false;

        const lookup = new Promise<boolean>((resolve) => {
            dns.lookup(host, { all: false }, (err) => resolve(!err));
        });

        const timeout = new Promise<boolean>((resolve) => {
            setTimeout(() => resolve(false), timeoutMs);
        });

        return Promise.race([lookup, timeout]);
    }

    static getRepoHost(url: string): string | undefined {
        const trimmed = url.trim();
        if (!trimmed) return undefined;

        try {
            const parsed = new URL(trimmed);
            if (parsed.hostname) return parsed.hostname;
        } catch { }

        const scpLike = trimmed.match(/^(?:.+@)?([^:\/]+):.+$/);
        if (scpLike?.[1]) return scpLike[1];

        return undefined;
    }

    static async ensureRepoCloned(url: string, branch?: string): Promise<string> {
        const repoPath = this.getRepoPath(url);

        if (!fs.existsSync(path.join(repoPath, '.git')) || !(await this.isValidGitRepo(repoPath))) {
            if (fs.existsSync(repoPath)) {
                fs.rmSync(repoPath, { recursive: true, force: true });
            }
            const dirName = path.basename(repoPath);
            const args = ['clone', '--depth', '1'];
            if (branch) args.push('--branch', branch);
            args.push(url, dirName);
            await this.execGitSilent(CACHE_DIR, args);
        }
        return repoPath;
    }

    static async pullRepo(url: string, branch?: string): Promise<void> {
        const repoPath = this.getRepoPath(url);

        await this.ensureRepoCloned(url, branch);

        await this.execGitSilent(repoPath, ['fetch', 'origin']);
        if (branch) {
            await this.execGitSilent(repoPath, ['checkout', branch]);
            await this.execGitSilent(repoPath, ['pull', 'origin', branch]);
        } else {
            await this.execGitSilent(repoPath, ['pull']);
        }
    }

    static async getSkillsFromRepo(url: string, branch?: string): Promise<Skill[]> {
        const repoPath = await this.ensureRepoCloned(url, branch);
        if (branch) {
            const currentBranch = await this.getCurrentBranch(repoPath);
            if (currentBranch !== branch) {
                await this.execGitSilent(repoPath, ['fetch', 'origin', branch]);
                await this.execGitSilent(repoPath, ['checkout', '-B', branch, `origin/${branch}`]);
            }
        }
        return scanSkillsFromDir(repoPath, url);
    }

    private static async getCurrentBranch(repoPath: string): Promise<string> {
        const output = await this.execGitOutputInDir(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD']);
        return output.trim();
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

    private static execGitOutputInDir(cwd: string, args: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            cp.execFile('git', args, {
                cwd,
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
