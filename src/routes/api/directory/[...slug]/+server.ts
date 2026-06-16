import { json, error } from '@sveltejs/kit';
import { createDirectory, deleteDirectory } from '$lib/server/content';

export async function POST({ params }) {
	const slug = params.slug;
	if (!slug) throw error(400, 'Slug is required');
	try {
		await createDirectory(slug);
		return json({ slug }, { status: 201 });
	} catch (e) {
		throw error(409, (e as Error).message);
	}
}

export async function DELETE({ params }) {
	const slug = params.slug;
	if (!slug) throw error(400, 'Slug is required');
	try {
		await deleteDirectory(slug);
		return json({ slug });
	} catch (e) {
		throw error(404, (e as Error).message);
	}
}
