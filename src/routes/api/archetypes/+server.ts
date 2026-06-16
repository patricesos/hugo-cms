import { json } from '@sveltejs/kit';
import { listArchetypes, listArchetypeTree } from '$lib/server/archetypes';

export async function GET({ url }) {
	if (url.searchParams.has('tree')) {
		const dir = url.searchParams.get('dir') || '';
		const tree = await listArchetypeTree(dir);
		return json(tree);
	}
	const archetypes = await listArchetypes();
	return json(archetypes);
}
