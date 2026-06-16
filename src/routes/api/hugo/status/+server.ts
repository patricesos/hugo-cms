import { json } from '@sveltejs/kit';
import { getHugoStatus } from '$lib/server/hugo';

export async function GET() {
	return json(getHugoStatus());
}
