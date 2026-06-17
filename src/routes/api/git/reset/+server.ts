import { json } from '@sveltejs/kit';
import { reset } from '$lib/server/git';

export const POST = async ({ request }) => {
	const { hash } = await request.json();
	if (!hash?.trim()) {
		return json({ error: 'Hash requis' }, { status: 400 });
	}
	const result = await reset(hash.trim());
	return json(result);
};
