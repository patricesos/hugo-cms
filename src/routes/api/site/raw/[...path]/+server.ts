import type { RequestEvent } from '@sveltejs/kit';
import { readRawSiteFile, getMimeType } from '$lib/server/site-tree';

export async function GET(event: RequestEvent) {
	const path = event.params.path;
	if (!path) {
		return new Response('Path requis', { status: 400 });
	}

	try {
		const content = await readRawSiteFile(path);
		const mime = getMimeType(path);
		return new Response(content as BodyInit, {
			headers: { 'Content-Type': mime },
		});
	} catch {
		return new Response('Fichier introuvable', { status: 404 });
	}
}
