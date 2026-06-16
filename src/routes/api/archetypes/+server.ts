import { json } from '@sveltejs/kit';
import { listArchetypes } from '$lib/server/archetypes';

export async function GET() {
	const archetypes = await listArchetypes();
	return json(archetypes);
}
