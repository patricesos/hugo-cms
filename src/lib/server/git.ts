import simpleGit from 'simple-git';
import { cmsConfig } from './config';

const repoRoot = cmsConfig.hugoSitePath;
const git = simpleGit(repoRoot);

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
		const isRepo = await git.checkIsRepo();
		if (!isRepo) return null;
		const status = await git.status();
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

export async function commit(message: string): Promise<{ hash: string; summary: string }> {
	await git.add('.');
	const result = await git.commit(message);
	return { hash: result.commit ?? '', summary: result.summary ?? '' };
}

export async function getLog(file?: string, maxCount = 20): Promise<GitLogEntry[]> {
	const log = file ? await git.log({ file, maxCount }) : await git.log({ maxCount });
	return log.all.map(entry => ({
		hash: entry.hash,
		date: entry.date,
		message: entry.message,
		authorName: entry.author_name,
	}));
}

export async function push(): Promise<{ pushed: boolean; message: string }> {
	const status = await git.status();
	if (status.ahead === 0) return { pushed: false, message: 'Rien à pousser' };
	const remote = cmsConfig.git.remote;
	const branch = cmsConfig.git.branch;
	await git.push(remote, branch);
	return { pushed: true, message: `Push vers ${remote}/${branch} effectué` };
}

export async function ensureRepo(): Promise<{ initialized: boolean; message: string }> {
	const isRepo = await git.checkIsRepo();
	if (isRepo) return { initialized: true, message: 'Déjà un dépôt git' };
	await git.init();
	return { initialized: true, message: 'Dépôt git initialisé' };
}
