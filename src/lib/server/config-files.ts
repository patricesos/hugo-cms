import { readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import { join, resolve, relative, dirname, isAbsolute } from 'node:path';
import { existsSync } from 'node:fs';
import { getCmsConfig } from './config';
import type { TreeNode } from './types';

function getConfigDir(): string {
	const config = getCmsConfig();
	return join(config.hugoSitePath, config.configDir);
}
const ROOT_CONFIG_PATTERNS = ['hugo.toml', 'hugo.yaml', 'hugo.yml', 'hugo.json'];

const CONFIG_EXTENSIONS = new Set(['toml', 'yaml', 'yml', 'json']);

function isConfigFile(name: string): boolean {
	return CONFIG_EXTENSIONS.has(name.split('.').pop()?.toLowerCase() ?? '');
}

function safeResolveIn(base: string, ...segments: string[]): string {
	const resolvedPath = resolve(base, ...segments);
	const rel = relative(resolve(base), resolvedPath);
	if (rel.startsWith('..') || isAbsolute(rel)) {
		throw new Error('Path traversal detected');
	}
	return resolvedPath;
}

export async function listConfigTree(): Promise<TreeNode[]> {
	const results: TreeNode[] = [];

	const configDir = getConfigDir();
	if (existsSync(configDir)) {
		await walkConfigDir(configDir, '', results);
	} else {
		for (const pattern of ROOT_CONFIG_PATTERNS) {
			const filePath = join(getCmsConfig().hugoSitePath, pattern);
			if (existsSync(filePath)) {
				results.push({
					type: 'file',
					name: pattern,
					slug: pattern,
					path: pattern,
					children: [],
					frontmatter: undefined,
				});
			}
		}
	}

	return results.sort((a, b) => a.name.localeCompare(b.name));
}

async function walkConfigDir(dir: string, prefix: string, results: TreeNode[]) {
	const entries = await readdir(dir, { withFileTypes: true });
	for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
		if (entry.name.startsWith('.')) continue;
		const fullPath = join(dir, entry.name);
		const slug = prefix ? `${prefix}/${entry.name}` : entry.name;

		if (entry.isDirectory()) {
			const children: TreeNode[] = [];
			await walkConfigDir(fullPath, slug, children);
			results.push({
				type: 'directory',
				name: entry.name,
				slug,
				path: slug,
				children,
				frontmatter: undefined,
			});
		} else if (entry.isFile() && isConfigFile(entry.name)) {
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
}

function resolveConfigPath(slug: string): string {
	const configDir = getConfigDir();
	if (existsSync(configDir)) {
		return safeResolveIn(configDir, slug);
	}
	for (const pattern of ROOT_CONFIG_PATTERNS) {
		if (slug === pattern) {
			return join(getCmsConfig().hugoSitePath, pattern);
		}
	}
	return safeResolveIn(configDir, slug);
}

export async function readConfigFile(slug: string): Promise<{ content: string; slug: string }> {
	const filePath = resolveConfigPath(slug);
	if (!existsSync(filePath)) {
		throw new Error(`Config file not found: ${slug}`);
	}
	const content = await readFile(filePath, 'utf-8');
	return { content, slug };
}

export async function writeConfigFile(slug: string, content: string): Promise<void> {
	const filePath = resolveConfigPath(slug);
	const dir = dirname(filePath);
	if (!existsSync(dir)) {
		throw new Error(`Config directory does not exist: ${dirname(slug)}`);
	}
	await writeFile(filePath, content, 'utf-8');
}

export async function deleteConfigFile(slug: string): Promise<void> {
	const filePath = resolveConfigPath(slug);
	if (!existsSync(filePath)) {
		throw new Error(`Config file not found: ${slug}`);
	}
	await unlink(filePath);
}
