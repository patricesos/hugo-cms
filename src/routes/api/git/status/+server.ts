import { json } from '@sveltejs/kit';
import { getStatus } from '$lib/server/git';

export const GET = async () => {
	const status = await getStatus();
	return json(status);
};
