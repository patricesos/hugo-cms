import { readdir, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
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
