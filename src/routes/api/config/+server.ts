import { json } from '@sveltejs/kit';
import { listConfigTree } from '$lib/server/config-files';

export async function GET({ url }) {
	const tree = url.searchParams.get('tree') === 'true';
	if (tree) {
		return json(await listConfigTree());
	}
	return json([]);
}
