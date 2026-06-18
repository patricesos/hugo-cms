import simpleGit from 'simple-git';
import { getCmsConfig } from './config';

let _git: ReturnType<typeof simpleGit> | null = null;

function getGit(): ReturnType<typeof simpleGit> {
	if (!_git) {
		_git = simpleGit(getCmsConfig().hugoSitePath);
	}
	return _git;
}

/** Pour les tests : force la réinitialisation de l'instance simple-git. */
export function __resetGitForTests(): void {
	_git = null;
}

export interface GitStatus {
	branch: string;
	modified: string[];
	added: string[];
	deleted: string[];
	renamed: string[];
	staged: string[];
	untracked: string[];
	ahead: number;
	behind: number;
}

export interface GitLogEntry {
	hash: string;
	date: string;
	message: string;
	authorName: string;
}

export async function getStatus(): Promise<GitStatus | null> {
	try {
		const g = getGit();
		const isRepo = await g.checkIsRepo();
		if (!isRepo) return null;
		const status = await g.status();
		return {
			branch: status.current ?? 'unknown',
			modified: status.modified,
			added: status.created,
			deleted: status.deleted,
			renamed: status.renamed.map(r => r.to),
			staged: status.staged,
			untracked: status.not_added,
			ahead: status.ahead,
			behind: status.behind,
		};
	} catch {
		return null;
	}
}

export async function commit(message: string, files?: string[]): Promise<{ hash: string; summary: { changes: number; insertions: number; deletions: number } }> {
	const g = getGit();
	if (files && files.length > 0) {
		await g.add(files);
	} else {
		await g.add('.');
	}
	const result = await g.commit(message);
	return { hash: result.commit ?? '', summary: result.summary ?? { changes: 0, insertions: 0, deletions: 0 } };
}

export async function getLog(file?: string, maxCount = 20): Promise<GitLogEntry[]> {
	const g = getGit();
	const log = file ? await g.log({ file, maxCount }) : await g.log({ maxCount });
	return log.all.map(entry => ({
		hash: entry.hash,
		date: entry.date,
		message: entry.message,
		authorName: entry.author_name,
	}));
}

export async function reset(hash: string): Promise<{ hash: string; message: string }> {
	const g = getGit();
	await g.reset(['--soft', hash]);
	return { hash, message: `Reset vers ${hash.slice(0, 7)}` };
}

export async function push(): Promise<{ pushed: boolean; message: string }> {
	const g = getGit();
	const status = await g.status();
	if (status.ahead === 0) return { pushed: false, message: 'Rien à pousser' };
	const config = getCmsConfig();
	const remote = config.git.remote;
	const branch = config.git.branch;
	await g.push(remote, branch);
	return { pushed: true, message: `Push vers ${remote}/${branch} effectué` };
}

export async function ensureRepo(): Promise<{ initialized: boolean; message: string }> {
	const g = getGit();
	const isRepo = await g.checkIsRepo();
	if (isRepo) return { initialized: true, message: 'Déjà un dépôt git' };
	await g.init();
	return { initialized: true, message: 'Dépôt git initialisé' };
}
