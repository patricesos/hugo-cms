import { json } from '@sveltejs/kit';
import { ensureRepo } from '$lib/server/git';

export const POST = async () => {
	const result = await ensureRepo();
	return json(result);
};
