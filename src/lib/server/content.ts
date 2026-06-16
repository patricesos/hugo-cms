import { readFile, writeFile, readdir, mkdir, rename, stat, rm } from 'node:fs/promises';
import { join, relative, resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { cmsConfig } from './config';
import { parseFrontmatter, serializeFrontmatter, detectFrontmatterLanguage } from './markdown';
import type { ContentMeta, ContentItem, TreeNode } from './types';
import type { FrontmatterLanguage } from './markdown';

const BASE = cmsConfig.hugoContentPath;
const TRASH_DIR = join(BASE, '_trash');

function safeResolve(...segments: string[]): string {
	const resolved = resolve(BASE, ...segments);
	if (!resolved.startsWith(resolve(BASE))) {
		throw new Error('Path traversal detected');
	}
	return resolved;
}

export async function listContent(dir: string = ''): Promise<ContentMeta[]> {
	const target = safeResolve(dir);
	const entries = await readdir(target, { withFileTypes: true });
	const results: ContentMeta[] = [];

	for (const entry of entries) {
		if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;

		const fullPath = join(target, entry.name);
		const slug = relative(BASE, fullPath).replace(/\\/g, '/');

		if (entry.isDirectory()) {
			results.push({ type: 'directory', name: entry.name, slug, path: slug });
		} else if (entry.name.endsWith('.md')) {
			const content = await readFile(fullPath, 'utf-8');
			const lang = detectFrontmatterLanguage(content);
			const fm = (content.startsWith('---') || content.startsWith('+++'))
				? parseFrontmatter(content).frontmatter
				: {};
			results.push({
				type: 'file',
				name: entry.name,
				slug: slug.replace(/\.md$/, ''),
				path: slug,
				frontmatter: fm,
			});
		}
	}

	return results.sort((a, b) => {
		if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
		return a.name.localeCompare(b.name);
	});
}

export async function readContent(slug: string): Promise<ContentItem> {
	const filePath = safeResolve(slug + '.md');
	const raw = await readFile(filePath, 'utf-8');
	const { frontmatter, body, language } = parseFrontmatter(raw);
	const stats = await stat(filePath);
	return { frontmatter, body, slug, mtimeMs: stats.mtimeMs, frontmatterLanguage: language };
}

export async function createContent(
	slug: string,
	body: string,
	frontmatter?: Record<string, unknown>,
	language: FrontmatterLanguage = 'yaml'
): Promise<ContentItem> {
	const filePath = safeResolve(slug + '.md');
	const dir = filePath.substring(0, filePath.lastIndexOf('\\'));
	if (!existsSync(dir)) {
		await mkdir(dir, { recursive: true });
	}
	const full = serializeFrontmatter(body, frontmatter || { title: 'Untitled', date: new Date().toISOString().split('T')[0], draft: true }, language);
	await writeFile(filePath, full, 'utf-8');
	const stats = await stat(filePath);
	return { frontmatter: frontmatter || {}, body, slug, mtimeMs: stats.mtimeMs, frontmatterLanguage: language };
}

export async function listContentTree(dir: string = ''): Promise<TreeNode[]> {
	const target = safeResolve(dir);
	const entries = await readdir(target, { withFileTypes: true });
	const results: TreeNode[] = [];

	for (const entry of entries) {
		if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
		const fullPath = join(target, entry.name);
		const slug = relative(BASE, fullPath).replace(/\\/g, '/');

		if (entry.isDirectory()) {
			const children = await listContentTree(dir ? `${dir}/${entry.name}` : entry.name);
			results.push({ type: 'directory', name: entry.name, slug, path: slug, children, frontmatter: undefined });
		} else if (entry.name.endsWith('.md')) {
			const raw = await readFile(fullPath, 'utf-8');
			const lang = detectFrontmatterLanguage(raw);
			const fm = (raw.startsWith('---') || raw.startsWith('+++'))
				? parseFrontmatter(raw).frontmatter
				: {};
			results.push({
				type: 'file',
				name: entry.name,
				slug: slug.replace(/\.md$/, ''),
				path: slug,
				frontmatter: fm,
				children: [],
			});
		}
	}

	return results.sort((a, b) => {
		if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
		return a.name.localeCompare(b.name);
	});
}

export async function updateContent(
	slug: string,
	body: string,
	frontmatter?: Record<string, unknown>,
	expectedMtimeMs?: number,
	language?: FrontmatterLanguage
): Promise<ContentItem> {
	const filePath = safeResolve(slug + '.md');
	const stats = await stat(filePath);
	if (expectedMtimeMs !== undefined && Math.abs(stats.mtimeMs - expectedMtimeMs) > 1) {
		throw Object.assign(new Error('File modified externally'), { statusCode: 409, serverMtimeMs: stats.mtimeMs });
	}
	const lang = language || 'yaml';
	const full = frontmatter
		? serializeFrontmatter(body, frontmatter, lang)
		: body;
	await writeFile(filePath, full, 'utf-8');
	const newStats = await stat(filePath);
	return { frontmatter: frontmatter || {}, body, slug, mtimeMs: newStats.mtimeMs, frontmatterLanguage: lang };
}

export async function deleteContent(slug: string): Promise<void> {
	const filePath = safeResolve(slug + '.md');
	if (!existsSync(TRASH_DIR)) {
		await mkdir(TRASH_DIR, { recursive: true });
	}
	const trashPath = join(TRASH_DIR, `${slug.replace(/[/\\]/g, '_')}_${Date.now()}.md`);
	await rename(filePath, trashPath);
}

export async function renameContent(slug: string, newSlug: string): Promise<ContentItem> {
	const filePath = safeResolve(slug + '.md');
	const newFilePath = safeResolve(newSlug + '.md');
	await mkdir(dirname(newFilePath), { recursive: true });
	await rename(filePath, newFilePath);
	return readContent(newSlug);
}

export async function createDirectory(slug: string): Promise<void> {
	const dirPath = safeResolve(slug);
	if (existsSync(dirPath)) {
		throw new Error(`Directory "${slug}" already exists`);
	}
	await mkdir(dirPath, { recursive: true });
}

export async function deleteDirectory(slug: string): Promise<void> {
	const dirPath = safeResolve(slug);
	if (!existsSync(dirPath)) {
		throw new Error(`Directory "${slug}" not found`);
	}
	if (!existsSync(TRASH_DIR)) {
		await mkdir(TRASH_DIR, { recursive: true });
	}
	const trashPath = join(TRASH_DIR, `${slug.replace(/[/\\]/g, '_')}_${Date.now()}`);
	await rename(dirPath, trashPath);
}

export async function listAssets(): Promise<string[]> {
	const staticDir = cmsConfig.hugoStaticPath;
	if (!existsSync(staticDir)) return [];
	const images: string[] = [];

	async function walk(dir: string) {
		const entries = await readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			const full = join(dir, entry.name);
			if (entry.isDirectory()) {
				await walk(full);
			} else if (/\.(png|jpg|jpeg|gif|svg|webp|avif)$/i.test(entry.name)) {
				images.push(relative(staticDir, full).replace(/\\/g, '/'));
			}
		}
	}

	await walk(staticDir);
	return images.sort();
}

export async function listAssetTree(dir: string = ''): Promise<TreeNode[]> {
	const staticDir = cmsConfig.hugoStaticPath;
	const target = dir ? join(staticDir, dir) : staticDir;
	if (!existsSync(target)) return [];
	const entries = await readdir(target, { withFileTypes: true });
	const results: TreeNode[] = [];

	for (const entry of entries) {
		if (entry.name.startsWith('.')) continue;
		const fullPath = join(target, entry.name);
		const slug = dir ? `${dir}/${entry.name}` : entry.name;

		if (entry.isDirectory()) {
			const children = await listAssetTree(slug);
			results.push({ type: 'directory', name: entry.name, slug, path: slug, children, frontmatter: undefined });
		} else {
			results.push({
				type: 'file',
				name: entry.name,
				slug,
				path: slug,
				children: [],
				frontmatter: { ext: entry.name.split('.').pop()?.toLowerCase() || '' },
			});
		}
	}

	return results.sort((a, b) => {
		if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
		return a.name.localeCompare(b.name);
	});
}
