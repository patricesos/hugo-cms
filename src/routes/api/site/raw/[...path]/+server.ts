import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { readRawSiteFile, getMimeType, writeSiteFile, deleteSiteFile } from '$lib/server/site-tree';

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

export async function PUT(event: RequestEvent) {
	const path = event.params.path;
	if (!path) {
		return json({ error: 'Path requis' }, { status: 400 });
	}

	const { content } = await event.request.json();
	if (typeof content !== 'string') {
		return json({ error: 'content is required' }, { status: 400 });
	}

	try {
		await writeSiteFile(path, content);
		return json({ ok: true });
	} catch (e) {
		return json({ error: (e as Error).message }, { status: 500 });
	}
}

export async function DELETE(event: RequestEvent) {
	const path = event.params.path;
	if (!path) {
		return json({ error: 'Path requis' }, { status: 400 });
	}

	try {
		await deleteSiteFile(path);
		return new Response(null, { status: 204 });
	} catch {
		return json({ error: 'Fichier introuvable' }, { status: 404 });
	}
}
