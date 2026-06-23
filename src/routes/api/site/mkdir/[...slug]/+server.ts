import { json } from '@sveltejs/kit';
import { createSiteDirectory } from '$lib/server/site-tree';

export async function POST({ params }) {
	const slug = params.slug;
	if (!slug) {
		return json({ error: 'Slug requis' }, { status: 400 });
	}
	try {
		await createSiteDirectory(slug);
		return json({ slug }, { status: 201 });
	} catch {
		return json({ error: 'Erreur lors de la création du dossier' }, { status: 500 });
	}
}
