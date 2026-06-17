import { json } from '@sveltejs/kit';
import { getLog } from '$lib/server/git';

export const GET = async ({ url }) => {
	const file = url.searchParams.get('file') ?? undefined;
	const log = await getLog(file);
	return json(log);
};
