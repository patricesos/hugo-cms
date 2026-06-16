import { error, json } from '@sveltejs/kit';
import { readContent, createContent, updateContent, deleteContent, renameContent } from '$lib/server/content';

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
	const { body, frontmatter, expectedMtimeMs } = await request.json();
	try {
		const item = await updateContent(slug, body, frontmatter, expectedMtimeMs);
		return json(item);
	} catch (e) {
		const err = e as Error & { statusCode?: number; serverMtimeMs?: number };
		if (err.statusCode === 409) {
			return json({ error: 'conflict', slug, serverMtimeMs: err.serverMtimeMs }, { status: 409 });
		}
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

export async function PATCH({ params, request }) {
	const slug = params.slug;
	if (!slug) error(400, 'Slug is required');
	const { newSlug } = await request.json();
	if (!newSlug) error(400, 'newSlug is required');
	try {
		const item = await renameContent(slug, newSlug);
		return json(item);
	} catch (e) {
		error(409, (e as Error).message);
	}
}
