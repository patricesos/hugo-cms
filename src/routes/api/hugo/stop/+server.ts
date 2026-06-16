import { json } from '@sveltejs/kit';
import { stopHugoServer } from '$lib/server/hugo';

export async function POST() {
	const status = await stopHugoServer();
	return json(status);
}
