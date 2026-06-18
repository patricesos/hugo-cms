import { json } from '@sveltejs/kit';
import { setRuntimeBindAddress, restartHugoServer, getHugoStatus } from '$lib/server/hugo';

export async function POST({ request }: { request: Request }) {
	const body: unknown = await request.json();
	if (!body || typeof body !== 'object' || !('bindAddress' in body) || typeof (body as Record<string, unknown>).bindAddress !== 'string') {
		return json({ error: 'bindAddress requis (string)' }, { status: 400 });
	}
	const { bindAddress } = body as { bindAddress: string };
	if (bindAddress !== '127.0.0.1' && bindAddress !== '0.0.0.0') {
		return json({ error: 'bindAddress doit être "127.0.0.1" ou "0.0.0.0"' }, { status: 400 });
	}
	setRuntimeBindAddress(bindAddress);
	const before = getHugoStatus();
	if (before.running) {
		const status = await restartHugoServer();
		return json(status);
	}
	return json(getHugoStatus());
}
