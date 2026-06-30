import type { RequestEvent } from '@sveltejs/kit';
import { renameSiteFile } from '$lib/server/site-tree';

export async function POST(event: RequestEvent) {
	const { oldSlug, newSlug } = await event.request.json();
	if (!oldSlug || !newSlug) {
		return new Response('oldSlug et newSlug requis', { status: 400 });
	}
	if (oldSlug.includes('..') || newSlug.includes('..')) {
		return new Response('Path traversal détecté', { status: 400 });
	}
	try {
		await renameSiteFile(oldSlug, newSlug);
		return new Response(null, { status: 200 });
	} catch {
		return new Response('Erreur lors du renommage', { status: 500 });
	}
}
