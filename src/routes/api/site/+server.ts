import { json } from '@sveltejs/kit';
import { listSiteTree } from '$lib/server/site-tree';

export async function GET() {
	const tree = await listSiteTree();
	return json(tree);
}
