import { json } from '@sveltejs/kit';
import { commit } from '$lib/server/git';

export const POST = async ({ request }) => {
	let parsed: unknown;
	try {
		parsed = await request.json();
	} catch {
		return json({ error: 'Corps JSON invalide' }, { status: 400 });
	}

	const message = (parsed as Record<string, unknown>).message;
	const files = (parsed as Record<string, unknown>).files;

	if (typeof message !== 'string' || !message.trim()) {
		return json({ error: 'Message de commit requis' }, { status: 400 });
	}
	if (files !== undefined && !Array.isArray(files)) {
		return json({ error: 'files doit être un tableau' }, { status: 400 });
	}

	const result = await commit(message.trim(), files as string[] | undefined);
	return json(result);
};
