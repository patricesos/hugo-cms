import { json, type RequestEvent } from '@sveltejs/kit';
import { switchActiveTheme } from '$lib/server/theme-install';
import { requireValidSite } from '$lib/server/config';

export async function POST(event: RequestEvent) {
	try {
		requireValidSite();
	} catch {
		return json({ error: 'Site non configuré.' }, { status: 400 });
	}

	let themeId: string;
	try {
		const body = await event.request.json();
		if (typeof body.themeId !== 'string' || !body.themeId.trim()) {
			return json({ error: 'themeId est requis.' }, { status: 400 });
		}
		themeId = body.themeId.trim();
	} catch {
		return json({ error: 'Corps JSON invalide.' }, { status: 400 });
	}

	const result = await switchActiveTheme(themeId);
	const status = result.success ? 200 : 400;
	return json(result, { status });
}
