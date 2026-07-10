import { json } from '@sveltejs/kit';
import { getHugoStatus } from '$lib/server/hugo';

export async function GET() {
	try {
		return json(getHugoStatus());
	} catch (e) {
		return json({ running: false, url: null, port: 0, error: String(e), live: false }, { status: 500 });
	}
}
