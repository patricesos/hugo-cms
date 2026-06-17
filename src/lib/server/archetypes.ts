import { readFile, readdir, writeFile, mkdir, stat, unlink } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { existsSync } from 'node:fs';
import { cmsConfig } from './config';
import type { TreeNode } from './types';

export interface Archetype {
	name: string;
	label: string;
	source: string;
}

const ARCHETYPES_DIR = join(cmsConfig.hugoSitePath, cmsConfig.archetypesDir);

export function getArchetypesDir(): string {
	return ARCHETYPES_DIR;
}

export function archetypeSlugToPath(slug: string): string {
	return join(ARCHETYPES_DIR, slug + '.md');
}

async function walkArchetypes(dir: string, prefix: string): Promise<Archetype[]> {
	if (!existsSync(dir)) return [];

	const entries = await readdir(dir, { withFileTypes: true });
	const results: Archetype[] = [];

	for (const entry of entries) {
		if (entry.name.startsWith('.')) continue;
		const fullPath = join(dir, entry.name);

		if (entry.isDirectory()) {
			const sub = await walkArchetypes(fullPath, prefix ? `${prefix}/${entry.name}` : entry.name);
			results.push(...sub);
		} else if (entry.isFile() && entry.name.endsWith('.md')) {
			const fileBase = entry.name.replace(/\.md$/, '');
			const name = prefix ? `${prefix}/${fileBase}` : fileBase;
			const source = await readFile(fullPath, 'utf-8');
			results.push({
				name,
				label: name.replace(/[/-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
				source,
			});
		}
	}

	return results;
}

export async function listArchetypes(): Promise<Archetype[]> {
	const results = await walkArchetypes(ARCHETYPES_DIR, '');

	results.sort((a, b) => {
		if (a.name === 'default') return -1;
		if (b.name === 'default') return 1;
		return a.name.localeCompare(b.name);
	});

	return results;
}

export async function listArchetypeTree(dir: string = ''): Promise<TreeNode[]> {
	const target = dir ? join(ARCHETYPES_DIR, dir) : ARCHETYPES_DIR;
	if (!existsSync(target)) return [];

	const entries = await readdir(target, { withFileTypes: true });
	const results: TreeNode[] = [];

	for (const entry of entries) {
		if (entry.name.startsWith('.')) continue;
		const fullPath = join(target, entry.name);
		const slug = dir ? `${dir}/${entry.name.replace(/\.md$/, '')}` : entry.name.replace(/\.md$/, '');

		if (entry.isDirectory()) {
			const children = await listArchetypeTree(slug);
			results.push({ type: 'directory', name: entry.name, slug, path: slug, children, frontmatter: undefined });
		} else if (entry.isFile() && entry.name.endsWith('.md')) {
			results.push({
				type: 'file',
				name: entry.name,
				slug,
				path: slug,
				children: [],
				frontmatter: undefined,
			});
		}
	}

	return results.sort((a, b) => {
		if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
		return a.name.localeCompare(b.name);
	});
}

export async function readArchetype(slug: string): Promise<Archetype> {
	const filePath = archetypeSlugToPath(slug);
	if (!existsSync(filePath)) {
		throw new Error(`Archetype not found: ${slug}`);
	}
	const source = await readFile(filePath, 'utf-8');
	const label = slug.replace(/[/-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	return { name: slug, label, source };
}

export async function createArchetype(slug: string, source: string): Promise<Archetype> {
	const filePath = archetypeSlugToPath(slug);
	if (existsSync(filePath)) {
		throw new Error(`Archetype already exists: ${slug}`);
	}
	const dir = dirname(filePath);
	if (!existsSync(dir)) {
		await mkdir(dir, { recursive: true });
	}
	await writeFile(filePath, source, 'utf-8');
	return readArchetype(slug);
}

export async function updateArchetype(slug: string, source: string): Promise<Archetype> {
	const filePath = archetypeSlugToPath(slug);
	if (!existsSync(filePath)) {
		throw new Error(`Archetype not found: ${slug}`);
	}
	await writeFile(filePath, source, 'utf-8');
	return readArchetype(slug);
}

export async function deleteArchetype(slug: string): Promise<void> {
	const filePath = archetypeSlugToPath(slug);
	if (!existsSync(filePath)) {
		throw new Error(`Archetype not found: ${slug}`);
	}
	await unlink(filePath);
}

export function renderArchetype(template: string, title: string, slug: string): string {
	const date = new Date().toISOString().split('T')[0];
	const contentBaseName = slug.split('/').pop() || slug;
	const titleCaseSlug = contentBaseName.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

	let result = template;
	result = result.replace(/\{\{\s*\.Date\s*\}\}/g, date);
	result = result.replace(/\{\{\s*\.Title\s*\}\}/g, title);
	result = result.replace(
		/\{\{\s*replace\s+\.File\.ContentBaseName\s+"-"\s+"\s+"\s*\|\s*title\s*\}\}/g,
		titleCaseSlug
	);
	result = result.replace(
		/\{\{\s*replace\s+\.Name\s+"-"\s+"\s+"\s*\|\s*title\s*\}\}/g,
		titleCaseSlug
	);
	result = result.replace(/\{\{\s*\.File\.ContentBaseName\s*\}\}/g, contentBaseName);
	result = result.replace(/\{\{\s*\.Slug\s*\}\}/g, slug);
	result = result.replace(/\{\{\s*\.Name\s*\}\}/g, slug);
	result = result.replace(/\{\{\s*now\.Year\s*\}\}/g, String(new Date().getFullYear()));

	result = result.replace(/\{\{-?\s*\}\}/g, '');

	return result;
}
