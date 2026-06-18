import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, realpathSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import simpleGit from 'simple-git';
import { __setCmsConfigForTests } from './config';
import { __resetGitForTests } from './git';

let testDir: string;

beforeEach(async () => {
	testDir = mkdtempSync(join(tmpdir(), 'hugo-cms-git-test-'));

	__setCmsConfigForTests({
		hugoSitePath: testDir,
		hugoContentPath: join(testDir, 'content'),
		hugoStaticPath: join(testDir, 'static'),
		cmsPort: 3000,
		hugoServerPort: 1313,
		hugoBindAddress: '127.0.0.1',
		defaultAuthor: 'test',
		dateFormat: 'YYYY-MM-DD',
		git: { enabled: true, remote: 'origin', branch: 'main' },
		trashDir: '_trash',
		archetypesDir: 'archetypes',
		configDir: 'config',
		shortcodesDir: 'layouts/shortcodes',
		imagesDir: 'images',
		hugoStartupTimeout: 15000,
		hugoStopTimeout: 5000,
		externalPollInterval: 5000,
		autoSaveDelay: 2000,
		fmSaveDelay: 2000,
		appTitle: 'Test',
		defaultArchetype: 'default',
	});
});

afterEach(() => {
	__resetGitForTests();
	__setCmsConfigForTests(null);
	if (testDir && existsSync(testDir)) {
		rmSync(testDir, { recursive: true, force: true });
	}
});

async function initRepo(): Promise<void> {
	const g = simpleGit(testDir);
	await g.init();
	await g.addConfig('user.name', 'Test');
	await g.addConfig('user.email', 'test@test.local');
}

async function writeAndCommit(path: string, content: string, msg: string): Promise<void> {
	const fullPath = join(testDir, path);
	mkdirSync(join(fullPath, '..'), { recursive: true });
	writeFileSync(fullPath, content, 'utf-8');
	const g = simpleGit(testDir);
	await g.add(path);
	await g.commit(msg);
}

describe('getStatus', () => {
	it('returns null for non-repo directory', async () => {
		const { getStatus } = await import('./git');
		const status = await getStatus();
		expect(status).toBeNull();
	});

	it('returns status for empty initialized repo', async () => {
		await initRepo();
		const { getStatus } = await import('./git');
		const status = await getStatus();
		expect(status).not.toBeNull();
		expect(status!.branch).toBe('main');
		expect(status!.modified).toEqual([]);
		expect(status!.untracked).toEqual([]);
	});

	it('shows untracked files', async () => {
		await initRepo();
		writeFileSync(join(testDir, 'new-file.md'), 'hello', 'utf-8');
		const { getStatus } = await import('./git');
		const status = await getStatus();
		expect(status!.untracked).toContain('new-file.md');
	});

	it('shows modified files after a commit', async () => {
		await initRepo();
		await writeAndCommit('readme.md', 'initial', 'init');
		writeFileSync(join(testDir, 'readme.md'), 'modified', 'utf-8');
		const { getStatus } = await import('./git');
		const status = await getStatus();
		expect(status!.modified).toContain('readme.md');
	});
});

describe('commit', () => {
	it('commits all changes when no files specified', async () => {
		await initRepo();
		writeFileSync(join(testDir, 'a.md'), 'a', 'utf-8');
		const { commit, getStatus } = await import('./git');
		const result = await commit('feat: add a');
		expect(result.hash).toBeTruthy();
		const status = await getStatus();
		expect(status!.untracked).toEqual([]);
	});

	it('commits only specified files', async () => {
		await initRepo();
		writeFileSync(join(testDir, 'only.md'), 'only', 'utf-8');
		writeFileSync(join(testDir, 'skip.md'), 'skip', 'utf-8');
		const { commit, getStatus } = await import('./git');
		const result = await commit('only', ['only.md']);
		expect(result.hash).toBeTruthy();
		const status = await getStatus();
		expect(status!.untracked).toContain('skip.md');
	});

	it('returns empty hash when nothing to commit', async () => {
		await initRepo();
		const { commit } = await import('./git');
		const result = await commit('nothing');
		expect(result.hash).toBe('');
	});
});

describe('getLog', () => {
	it('returns commits in reverse chronological order', async () => {
		await initRepo();
		await writeAndCommit('a.md', 'a', 'first');
		await writeAndCommit('b.md', 'b', 'second');
		const { getLog } = await import('./git');
		const log = await getLog();
		expect(log).toHaveLength(2);
		expect(log[0].message).toBe('second');
		expect(log[1].message).toBe('first');
		expect(log[0].hash).toHaveLength(40);
		expect(log[0].authorName).toBe('Test');
	});

	it('respects maxCount', async () => {
		await initRepo();
		await writeAndCommit('a.md', 'a', 'first');
		await writeAndCommit('b.md', 'b', 'second');
		await writeAndCommit('c.md', 'c', 'third');
		const { getLog } = await import('./git');
		const log = await getLog(undefined, 2);
		expect(log).toHaveLength(2);
	});

	it('returns empty array for a file never committed', async () => {
		await initRepo();
		await writeAndCommit('existing.md', 'x', 'base');
		const { getLog } = await import('./git');
		const log = await getLog('nonexistent.md');
		expect(log).toEqual([]);
	});
});

describe('reset', () => {
	it('performs soft reset to an earlier commit', async () => {
		await initRepo();
		await writeAndCommit('a.md', 'a', 'first');
		await writeAndCommit('b.md', 'b', 'second');
		const { reset, getLog } = await import('./git');
		const log = await getLog();
		const firstHash = log[1].hash;
		await reset(firstHash);
		const { getStatus } = await import('./git');
		const status = await getStatus();
		expect(status!.staged).toContain('b.md');
	});

	it('throws for invalid hash', async () => {
		await initRepo();
		const { reset } = await import('./git');
		await expect(reset('0000000000000000000000000000000000000000')).rejects.toThrow();
	});
});

describe('push', () => {
	it('returns not-pushed when ahead is 0', async () => {
		await initRepo();
		const { push } = await import('./git');
		const result = await push();
		expect(result.pushed).toBe(false);
		expect(result.message).toBe('Rien à pousser');
	});

	it('throws when remote is unreachable but branch is ahead', async () => {
		await initRepo();
		await writeAndCommit('base.md', 'base', 'base');

		const bareDir = mkdtempSync(join(realpathSync(tmpdir()), 'hugo-cms-bare-'));
		const g = simpleGit(testDir);
		try {
			await g.raw(['init', '--bare', bareDir]);
			await g.raw(['remote', 'add', 'origin', bareDir]);
			await g.push('origin', 'main', ['-u']);
			rmSync(bareDir, { recursive: true, force: true });
			await writeAndCommit('ahead.md', 'ahead', 'ahead');
			const { push } = await import('./git');
			await expect(push()).rejects.toThrow();
		} finally {
			if (existsSync(bareDir)) rmSync(bareDir, { recursive: true, force: true });
		}
	});
});

describe('ensureRepo', () => {
	it('initializes a new repo', async () => {
		const { ensureRepo } = await import('./git');
		const result = await ensureRepo();
		expect(result.initialized).toBe(true);
		expect(result.message).toBe('Dépôt git initialisé');
		expect(existsSync(join(testDir, '.git'))).toBe(true);
	});

	it('does nothing when repo already exists', async () => {
		await initRepo();
		const { ensureRepo } = await import('./git');
		const result = await ensureRepo();
		expect(result.initialized).toBe(true);
		expect(result.message).toBe('Déjà un dépôt git');
	});
});
