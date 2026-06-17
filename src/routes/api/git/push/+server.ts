import { json } from '@sveltejs/kit';
import { push } from '$lib/server/git';

export const POST = async () => {
	const result = await push();
	return json(result);
};
