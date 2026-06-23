import { readdir, readFile, access, rename, mkdir, writeFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { getCmsConfig } from './config';
import type { TreeNode } from './types';

/** Walk récursif du dossier racine Hugo (hugoSitePath).
 *  Skip les fichiers/dossiers cachés (commençant par .).
 *  Inclut TOUS les types de fichiers. */
export async function listSiteTree(dir: string = ''): Promise<TreeNode[]> {
	const root = getCmsConfig().hugoSitePath;
	const target = dir ? join(root, dir) : root;

	try {
		await access(target);
	} catch {
		return [];
	}

	const entries = await readdir(target, { withFileTypes: true });
	const results: TreeNode[] = [];

	for (const entry of entries) {
		if (entry.name.startsWith('.')) continue;
		const fullPath = join(target, entry.name);
		const slug = dir ? `${dir}/${entry.name}` : entry.name;

		if (entry.isDirectory()) {
			const children = await listSiteTree(slug);
			results.push({
				type: 'directory',
				name: entry.name,
				slug,
				path: slug,
				children,
				frontmatter: undefined,
			});
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

/** Sert le contenu brut d'un fichier depuis hugoSitePath. */
export async function readRawSiteFile(slug: string): Promise<Uint8Array> {
	const root = getCmsConfig().hugoSitePath;
	const filePath = join(root, slug);
	const buf = await readFile(filePath);
	return new Uint8Array(buf);
}

/** Renomme/déplace un fichier ou dossier dans hugoSitePath. */
export async function renameSiteFile(oldSlug: string, newSlug: string): Promise<void> {
	const root = getCmsConfig().hugoSitePath;
	const oldPath = join(root, oldSlug);
	const newPath = join(root, newSlug);
	await mkdir(dirname(newPath), { recursive: true });
	await rename(oldPath, newPath);
}

/** Écrit le contenu textuel d'un fichier dans hugoSitePath. */
export async function writeSiteFile(slug: string, content: string): Promise<void> {
	const root = getCmsConfig().hugoSitePath;
	const filePath = join(root, slug);
	await mkdir(dirname(filePath), { recursive: true });
	await writeFile(filePath, content, 'utf-8');
}

/** Crée un dossier dans hugoSitePath. */
export async function createSiteDirectory(slug: string): Promise<void> {
	const root = getCmsConfig().hugoSitePath;
	const dirPath = join(root, slug);
	await mkdir(dirPath, { recursive: true });
}

/** Supprime un fichier ou dossier dans hugoSitePath. */
export async function deleteSiteFile(slug: string): Promise<void> {
	const root = getCmsConfig().hugoSitePath;
	const filePath = join(root, slug);
	await rm(filePath, { recursive: true });
}

/** Détermine le content-type MIME à partir de l'extension. */
export function getMimeType(slug: string): string {
	const ext = slug.split('.').pop()?.toLowerCase() ?? '';
	const mimes: Record<string, string> = {
		toml: 'application/toml',
		yaml: 'text/yaml',
		yml: 'text/yaml',
		json: 'application/json',
		md: 'text/markdown',
		html: 'text/html',
		css: 'text/css',
		js: 'application/javascript',
		ts: 'application/typescript',
		png: 'image/png',
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		gif: 'image/gif',
		svg: 'image/svg+xml',
		webp: 'image/webp',
		ico: 'image/x-icon',
		woff: 'font/woff',
		woff2: 'font/woff2',
		ttf: 'font/ttf',
		otf: 'font/otf',
		pdf: 'application/pdf',
		zip: 'application/zip',
		xml: 'application/xml',
		txt: 'text/plain',
	};
	return mimes[ext] || 'application/octet-stream';
}
