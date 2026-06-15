import { json } from '@sveltejs/kit';
import { listContent } from '$lib/server/content';

export async function GET({ url }) {
	const dir = url.searchParams.get('dir') || '';
	const items = await listContent(dir);
	return json(items);
}
