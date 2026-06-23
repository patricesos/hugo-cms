import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { __setCmsConfigForTests } from './config';

let tmpDir: string;

beforeAll(() => {
	tmpDir = mkdtempSync(join(tmpdir(), 'hugo-cms-site-tree-'));
	mkdirSync(join(tmpDir, 'content'), { recursive: true });
	mkdirSync(join(tmpDir, 'assets'), { recursive: true });
	mkdirSync(join(tmpDir, 'archetypes'), { recursive: true });
	mkdirSync(join(tmpDir, 'data'), { recursive: true });

	writeFileSync(join(tmpDir, 'hugo.toml'), 'baseURL = "https://example.com"\n');
	writeFileSync(join(tmpDir, 'content', 'hello.md'), '# Hello\n');
	writeFileSync(join(tmpDir, 'assets', 'style.css'), '.foo { color: red; }\n');
	writeFileSync(join(tmpDir, 'data', 'menu.yaml'), 'main:\n  - name: Home\n');

	__setCmsConfigForTests({
		hugoSitePath: tmpDir,
		hugoContentPath: join(tmpDir, 'content'),
		hugoStaticPath: join(tmpDir, 'static'),
		cmsPort: 3000,
		cmsBindAddress: '127.0.0.1',
		hugoServerPort: 1313,
		hugoBindAddress: '127.0.0.1',
		defaultAuthor: 'test',
		dateFormat: 'YYYY-MM-DD',
		git: { enabled: false, remote: 'origin', branch: 'main' },
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
		siteValid: true,
	});
});

afterAll(() => {
	__setCmsConfigForTests(null);
	if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
});

describe('listSiteTree', () => {
	it('lists files and directories at root', async () => {
		const { listSiteTree } = await import('./site-tree');
		const items = await listSiteTree();
		const names = items.map(i => i.name);
		expect(names).toContain('hugo.toml');
		expect(names).toContain('content');
		expect(names).toContain('assets');
		expect(names).toContain('data');
	});

	it('lists nested files and directories', async () => {
		const { listSiteTree } = await import('./site-tree');
		const contentItems = await listSiteTree('content');
		const names = contentItems.map(i => i.name);
		expect(names).toContain('hello.md');
	});

	it('returns empty array for non-existent directory', async () => {
		const { listSiteTree } = await import('./site-tree');
		const items = await listSiteTree('nonexistent');
		expect(items).toEqual([]);
	});

	it('hides dot-files and dot-directories', async () => {
		// Créer un fichier caché temporaire
		mkdirSync(join(tmpDir, '.hidden-dir'), { recursive: true });
		writeFileSync(join(tmpDir, '.hidden-file'), 'secret');

		const { listSiteTree } = await import('./site-tree');
		const items = await listSiteTree();
		const names = items.map(i => i.name);
		expect(names).not.toContain('.hidden-dir');
		expect(names).not.toContain('.hidden-file');
	});

	it('sorts directories before files, then alphabetically', async () => {
		const { listSiteTree } = await import('./site-tree');
		const items = await listSiteTree();
		const order = items.map(i => i.name);

		// les dossiers d'abord
		const dirIdx = order.findIndex(n => n === 'assets');
		const fileIdx = order.findIndex(n => n === 'hugo.toml');
		expect(dirIdx).toBeLessThan(fileIdx);
	});
});

describe('readRawSiteFile', () => {
	it('reads file content as Uint8Array', async () => {
		const { readRawSiteFile } = await import('./site-tree');
		const buf = await readRawSiteFile('hugo.toml');
		const text = new TextDecoder().decode(buf);
		expect(text).toContain('baseURL');
	});

	it('reads nested file', async () => {
		const { readRawSiteFile } = await import('./site-tree');
		const buf = await readRawSiteFile('content/hello.md');
		const text = new TextDecoder().decode(buf);
		expect(text).toContain('# Hello');
	});

	it('throws on non-existent file', async () => {
		const { readRawSiteFile } = await import('./site-tree');
		await expect(readRawSiteFile('no-such-file.txt')).rejects.toThrow();
	});
});

describe('writeSiteFile', () => {
	it('writes a new file', async () => {
		const { writeSiteFile } = await import('./site-tree');
		await writeSiteFile('new-test-file.txt', 'hello from test');

		const content = readFileSync(join(tmpDir, 'new-test-file.txt'), 'utf-8');
		expect(content).toBe('hello from test');
	});

	it('overwrites an existing file', async () => {
		const { writeSiteFile } = await import('./site-tree');
		await writeSiteFile('new-test-file.txt', 'overwritten content');

		const content = readFileSync(join(tmpDir, 'new-test-file.txt'), 'utf-8');
		expect(content).toBe('overwritten content');
	});

	it('creates intermediate directories', async () => {
		const { writeSiteFile } = await import('./site-tree');
		await writeSiteFile('deep/nested/dir/file.txt', 'deep content');

		const content = readFileSync(join(tmpDir, 'deep/nested/dir/file.txt'), 'utf-8');
		expect(content).toBe('deep content');
	});
});

describe('renameSiteFile', () => {
	it('renames a file', async () => {
		const { renameSiteFile, readRawSiteFile } = await import('./site-tree');
		await renameSiteFile('new-test-file.txt', 'renamed-file.txt');

		const buf = await readRawSiteFile('renamed-file.txt');
		const text = new TextDecoder().decode(buf);
		expect(text).toBe('overwritten content');

		await expect(readRawSiteFile('new-test-file.txt')).rejects.toThrow();
	});

	it('renames a directory', async () => {
		const { renameSiteFile, listSiteTree } = await import('./site-tree');
		await renameSiteFile('data', 'data-renamed');

		const rootItems = await listSiteTree();
		const names = rootItems.map(i => i.name);
		expect(names).toContain('data-renamed');
		expect(names).not.toContain('data');

		// Remettre comme avant pour ne pas casser les autres tests
		await renameSiteFile('data-renamed', 'data');
	});
});

describe('deleteSiteFile', () => {
	it('deletes a file', async () => {
		const { deleteSiteFile } = await import('./site-tree');
		writeFileSync(join(tmpDir, 'to-delete.txt'), 'delete me');

		await deleteSiteFile('to-delete.txt');

		expect(() => readFileSync(join(tmpDir, 'to-delete.txt'))).toThrow();
	});

	it('throws on non-existent file', async () => {
		const { deleteSiteFile } = await import('./site-tree');
		await expect(deleteSiteFile('no-such-file.txt')).rejects.toThrow();
	});
});

describe('getMimeType', () => {
	it('returns correct MIME types', async () => {
		const { getMimeType } = await import('./site-tree');
		expect(getMimeType('file.toml')).toBe('application/toml');
		expect(getMimeType('file.yaml')).toBe('text/yaml');
		expect(getMimeType('file.yml')).toBe('text/yaml');
		expect(getMimeType('file.json')).toBe('application/json');
		expect(getMimeType('file.md')).toBe('text/markdown');
		expect(getMimeType('file.html')).toBe('text/html');
		expect(getMimeType('file.css')).toBe('text/css');
		expect(getMimeType('file.js')).toBe('application/javascript');
		expect(getMimeType('file.ts')).toBe('application/typescript');
		expect(getMimeType('file.png')).toBe('image/png');
		expect(getMimeType('file.jpg')).toBe('image/jpeg');
		expect(getMimeType('file.jpeg')).toBe('image/jpeg');
		expect(getMimeType('file.svg')).toBe('image/svg+xml');
		expect(getMimeType('file.pdf')).toBe('application/pdf');
	});

	it('returns octet-stream for unknown extensions', async () => {
		const { getMimeType } = await import('./site-tree');
		expect(getMimeType('file.unknown')).toBe('application/octet-stream');
	});

	it('returns octet-stream for files without extension', async () => {
		const { getMimeType } = await import('./site-tree');
		expect(getMimeType('Makefile')).toBe('application/octet-stream');
	});
});
