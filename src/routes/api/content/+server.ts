import { json } from '@sveltejs/kit';
import { listContent, listContentTree } from '$lib/server/content';

export async function GET({ url }) {
	if (url.searchParams.has('tree')) {
		const dir = url.searchParams.get('dir') || '';
		const tree = await listContentTree(dir);
		return json(tree);
	}
	const dir = url.searchParams.get('dir') || '';
	const items = await listContent(dir);
	return json(items);
}
