import { readFile, writeFile, readdir, mkdir, rename } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { cmsConfig } from './config';
import { parseFrontmatter, serializeFrontmatter } from './markdown';
import type { ContentMeta, ContentItem, TreeNode } from './types';

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
			const fm = content.startsWith('---') ? parseFrontmatter(content).frontmatter : {};
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
	const { frontmatter, body } = parseFrontmatter(raw);
	return { frontmatter, body, slug };
}

export async function createContent(
	slug: string,
	body: string,
	frontmatter?: Record<string, unknown>
): Promise<ContentItem> {
	const filePath = safeResolve(slug + '.md');
	const dir = filePath.substring(0, filePath.lastIndexOf('\\'));
	if (!existsSync(dir)) {
		await mkdir(dir, { recursive: true });
	}
	const full = serializeFrontmatter(body, frontmatter || { title: 'Untitled', date: new Date().toISOString().split('T')[0], draft: true });
	await writeFile(filePath, full, 'utf-8');
	return { frontmatter: frontmatter || {}, body, slug };
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
			const content = await readFile(fullPath, 'utf-8');
			const fm = content.startsWith('---') ? parseFrontmatter(content).frontmatter : {};
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
	frontmatter?: Record<string, unknown>
): Promise<ContentItem> {
	const filePath = safeResolve(slug + '.md');
	const full = frontmatter
		? serializeFrontmatter(body, frontmatter)
		: body;
	await writeFile(filePath, full, 'utf-8');
	return { frontmatter: frontmatter || {}, body, slug };
}

export async function deleteContent(slug: string): Promise<void> {
	const filePath = safeResolve(slug + '.md');
	if (!existsSync(TRASH_DIR)) {
		await mkdir(TRASH_DIR, { recursive: true });
	}
	const trashPath = join(TRASH_DIR, `${slug.replace(/[/\\]/g, '_')}_${Date.now()}.md`);
	await rename(filePath, trashPath);
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
