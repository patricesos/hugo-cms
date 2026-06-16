import { error, json } from '@sveltejs/kit';
import { readArchetype, createArchetype, updateArchetype, deleteArchetype } from '$lib/server/archetypes';

export async function GET({ params }) {
	const name = params.name;
	if (!name) error(400, 'Archetype name is required');
	try {
		const archetype = await readArchetype(name);
		return json(archetype);
	} catch (e) {
		error(404, (e as Error).message);
	}
}

export async function POST({ params, request }) {
	const name = params.name;
	if (!name) error(400, 'Archetype name is required');
	const { source } = await request.json();
	if (typeof source !== 'string') error(400, 'source is required');
	try {
		const archetype = await createArchetype(name, source);
		return json(archetype, { status: 201 });
	} catch (e) {
		error(409, (e as Error).message);
	}
}

export async function PUT({ params, request }) {
	const name = params.name;
	if (!name) error(400, 'Archetype name is required');
	const { source } = await request.json();
	if (typeof source !== 'string') error(400, 'source is required');
	try {
		const archetype = await updateArchetype(name, source);
		return json(archetype);
	} catch (e) {
		error(404, (e as Error).message);
	}
}

export async function DELETE({ params }) {
	const name = params.name;
	if (!name) error(400, 'Archetype name is required');
	try {
		await deleteArchetype(name);
		return new Response(null, { status: 204 });
	} catch (e) {
		error(404, (e as Error).message);
	}
}
