import { error, json } from '@sveltejs/kit';
import { readContent, createContent, updateContent, deleteContent } from '$lib/server/content';

export async function GET({ params }) {
	const slug = params.slug;
	if (!slug) error(400, 'Slug is required');
	try {
		const item = await readContent(slug);
		return json(item);
	} catch (e) {
		error(404, (e as Error).message);
	}
}

export async function POST({ params, request }) {
	const slug = params.slug;
	if (!slug) error(400, 'Slug is required');
	const { body, frontmatter } = await request.json();
	try {
		const item = await createContent(slug, body, frontmatter);
		return json(item, { status: 201 });
	} catch (e) {
		error(409, (e as Error).message);
	}
}

export async function PUT({ params, request }) {
	const slug = params.slug;
	if (!slug) error(400, 'Slug is required');
	const { body, frontmatter } = await request.json();
	try {
		const item = await updateContent(slug, body, frontmatter);
		return json(item);
	} catch (e) {
		error(404, (e as Error).message);
	}
}

export async function DELETE({ params }) {
	const slug = params.slug;
	if (!slug) error(400, 'Slug is required');
	try {
		await deleteContent(slug);
		return new Response(null, { status: 204 });
	} catch (e) {
		error(404, (e as Error).message);
	}
}
