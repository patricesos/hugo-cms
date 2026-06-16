import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { cmsConfig } from './config';

export interface Archetype {
	name: string;
	label: string;
	source: string;
}

const HUGO_ROOT = resolve(cmsConfig.hugoContentPath, '..');
const ARCHETYPES_DIR = join(HUGO_ROOT, 'archetypes');

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
	result = result.replace(/\{\{\s*\.File\.ContentBaseName\s*\}\}/g, contentBaseName);
	result = result.replace(/\{\{\s*\.Slug\s*\}\}/g, slug);
	result = result.replace(/\{\{\s*\.Name\s*\}\}/g, slug);

	result = result.replace(/\{\{-?\s*\}\}/g, '');

	return result;
}
