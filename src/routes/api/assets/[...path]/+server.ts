import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cmsConfig } from '$lib/server/config';

const MIME_TYPES: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp',
	svg: 'image/svg+xml',
	ico: 'image/x-icon',
	pdf: 'application/pdf',
};

export async function GET({ params }) {
	const filePath = join(cmsConfig.hugoStaticPath, params.path);
	const ext = filePath.split('.').pop()?.toLowerCase() || '';
	const contentType = MIME_TYPES[ext] || 'application/octet-stream';
	try {
		const buffer = await readFile(filePath);
		return new Response(buffer, {
			headers: { 'Content-Type': contentType, 'Cache-Control': 'no-cache' },
		});
	} catch {
		return new Response('Not found', { status: 404 });
	}
}
