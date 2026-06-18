import { json } from '@sveltejs/kit';
import { readConfigFile, writeConfigFile, deleteConfigFile } from '$lib/server/config-files';

export async function GET({ params }) {
	const slug = params.path;
	if (!slug) return json({ error: 'Config file path is required' }, { status: 400 });
	try {
		const result = await readConfigFile(slug);
		return json(result);
	} catch (e) {
		return json({ error: (e as Error).message }, { status: 404 });
	}
}

export async function PUT({ params, request }) {
	const slug = params.path;
	if (!slug) return json({ error: 'Config file path is required' }, { status: 400 });
	const { content } = await request.json();
	if (typeof content !== 'string') return json({ error: 'content is required' }, { status: 400 });
	try {
		await writeConfigFile(slug, content);
		return json({ ok: true });
	} catch (e) {
		return json({ error: (e as Error).message }, { status: 500 });
	}
}

export async function DELETE({ params }) {
	const slug = params.path;
	if (!slug) return json({ error: 'Config file path is required' }, { status: 400 });
	try {
		await deleteConfigFile(slug);
		return new Response(null, { status: 204 });
	} catch (e) {
		return json({ error: (e as Error).message }, { status: 404 });
	}
}
