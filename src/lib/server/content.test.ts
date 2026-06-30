import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { __setCmsConfigForTests } from './config';

let tmpDir: string;
let contentDir: string;
let staticDir: string;

beforeAll(() => {
	tmpDir = mkdtempSync(join(tmpdir(), 'hugo-cms-test-'));
	contentDir = join(tmpDir, 'content');
	staticDir = join(tmpDir, 'static');
	mkdirSync(contentDir, { recursive: true });
	mkdirSync(staticDir, { recursive: true });

	__setCmsConfigForTests({
		hugoSitePath: tmpDir,
		hugoContentPath: contentDir,
		hugoStaticPath: staticDir,
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

	writeFileSync(join(contentDir, 'hello.md'), `---
title: "Hello"
date: 2026-01-01
---
Body.
`);

	writeFileSync(join(contentDir, 'draft.md'), `---
title: "Draft"
draft: true
---
Draft body.
`);

	const blog = join(contentDir, 'blog');
	mkdirSync(blog, { recursive: true });
	writeFileSync(join(blog, 'post.md'), `---
title: "Blog Post"
---
Blog body.
`);
});

afterAll(() => {
	__setCmsConfigForTests(null);
	if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
});

describe('listContent', () => {
	it('lists files and directories at root', async () => {
		const { listContent } = await import('./content');
		const items = await listContent();
		const names = items.map((i) => i.name);
		expect(names).toContain('hello.md');
		expect(names).toContain('draft.md');
		expect(names).toContain('blog');
	});

	it('lists nested content', async () => {
		const { listContent } = await import('./content');
		const items = await listContent('blog');
		expect(items).toHaveLength(1);
		expect(items[0].name).toBe('post.md');
	});

	it('includes draft status in frontmatter', async () => {
		const { listContent } = await import('./content');
		const items = await listContent();
		const draft = items.find((i) => i.name === 'draft.md');
		expect(draft?.frontmatter?.draft).toBe(true);
		const hello = items.find((i) => i.name === 'hello.md');
		expect(hello?.frontmatter?.draft).toBeUndefined();
	});

	it('returns tree with nested children', async () => {
		const { listContentTree } = await import('./content');
		const tree = await listContentTree();
		const blog = tree.find((n) => n.name === 'blog');
		expect(blog?.type).toBe('directory');
		expect(blog?.children).toBeDefined();
		const post = blog?.children?.find((c) => c.name === 'post.md');
		expect(post?.type).toBe('file');
		expect(post?.frontmatter?.title).toBe('Blog Post');
	});
});

describe('path traversal prevention', () => {
	it('rejects paths with ../', async () => {
		const { readContent } = await import('./content');
		await expect(readContent('../../etc/passwd')).rejects.toThrow('Path traversal');
	});

	it('rejects absolute paths', async () => {
		const { readContent } = await import('./content');
		await expect(readContent('/etc/passwd')).rejects.toThrow('Path traversal');
	});
});

describe('readContent', () => {
	it('reads an existing file', async () => {
		const { readContent } = await import('./content');
		const item = await readContent('hello');
		expect(item.frontmatter.title).toBe('Hello');
		expect(item.body.trim()).toBe('Body.');
		expect(item.slug).toBe('hello');
	});

	it('reads a file in a subdirectory', async () => {
		const { readContent } = await import('./content');
		const item = await readContent('blog/post');
		expect(item.frontmatter.title).toBe('Blog Post');
		expect(item.body.trim()).toBe('Blog body.');
	});
});

describe('createContent', () => {
	it('creates a new file', async () => {
		const { createContent, readContent } = await import('./content');
		await createContent('new-file', 'New body', { title: 'New', date: '2026-06-15' });
		const item = await readContent('new-file');
		expect(item.frontmatter.title).toBe('New');
		expect(item.body.trim()).toBe('New body');
	});

	it('creates a file in a nested directory', async () => {
		const { createContent, readContent } = await import('./content');
		await createContent('projects/new-project', 'Project body', { title: 'Project' });
		const item = await readContent('projects/new-project');
		expect(item.frontmatter.title).toBe('Project');
	});
});

describe('updateContent', () => {
	it('updates body of an existing file', async () => {
		const { updateContent, readContent } = await import('./content');
		await updateContent('hello', 'Updated body.', { title: 'Hello Updated', date: '2026-01-01' });
		const item = await readContent('hello');
		expect(item.body.trim()).toBe('Updated body.');
		expect(item.frontmatter.title).toBe('Hello Updated');
	});
});

describe('listAssets', () => {
	it('returns empty array when no static dir has images', async () => {
		const { listAssets } = await import('./content');
		const assets = await listAssets();
		expect(Array.isArray(assets)).toBe(true);
	});

	it('finds images in static directory', async () => {
		const imagesDir = join(staticDir, 'images');
		mkdirSync(imagesDir, { recursive: true });
		writeFileSync(join(imagesDir, 'test.png'), 'fake-png');
		writeFileSync(join(staticDir, 'readme.txt'), 'not an image');

		const { listAssets } = await import('./content');
		const assets = await listAssets();
		expect(assets).toContain('images/test.png');
		expect(assets).not.toContain('readme.txt');
	});
});

describe('deleteContent', () => {
	it('moves file to trash dir', async () => {
		const { deleteContent } = await import('./content');
		const { readdirSync } = await import('node:fs');
		await deleteContent('draft');
		const trashDir = join(tmpDir, '_trash');
		const trashFiles = readdirSync(trashDir);
		expect(trashFiles.length).toBeGreaterThan(0);
		expect(trashFiles.some((f) => f.includes('draft'))).toBe(true);
	});
});
