import { error, json } from '@sveltejs/kit';
import { readConfigFile, writeConfigFile, deleteConfigFile } from '$lib/server/config-files';

export async function GET({ params }) {
	const slug = params.path;
	if (!slug) error(400, 'Config file path is required');
	try {
		const result = await readConfigFile(slug);
		return json(result);
	} catch (e) {
		error(404, (e as Error).message);
	}
}

export async function PUT({ params, request }) {
	const slug = params.path;
	if (!slug) error(400, 'Config file path is required');
	const { content } = await request.json();
	if (typeof content !== 'string') error(400, 'content is required');
	try {
		await writeConfigFile(slug, content);
		return json({ ok: true });
	} catch (e) {
		error(500, (e as Error).message);
	}
}

export async function DELETE({ params }) {
	const slug = params.path;
	if (!slug) error(400, 'Config file path is required');
	try {
		await deleteConfigFile(slug);
		return new Response(null, { status: 204 });
	} catch (e) {
		error(404, (e as Error).message);
	}
}
