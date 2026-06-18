import { json } from '@sveltejs/kit';
import { reset } from '$lib/server/git';

export const POST = async ({ request }) => {
	let parsed: unknown;
	try {
		parsed = await request.json();
	} catch {
		return json({ error: 'Corps JSON invalide' }, { status: 400 });
	}

	const hash = (parsed as Record<string, unknown>).hash;
	if (typeof hash !== 'string' || !hash.trim()) {
		return json({ error: 'Hash requis' }, { status: 400 });
	}

	const result = await reset(hash.trim());
	return json(result);
};
