import { json } from '@sveltejs/kit';
import { startHugoServer } from '$lib/server/hugo';

export async function POST() {
	const status = await startHugoServer();
	return json(status);
}
