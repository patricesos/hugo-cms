import { json } from '@sveltejs/kit';
import { getActiveTheme, getInstalledThemes } from '$lib/server/theme-install';
import { requireValidSite } from '$lib/server/config';

export async function GET() {
	try {
		requireValidSite();
	} catch {
		return json({ error: 'Site non configuré.' }, { status: 400 });
	}

	const active = await getActiveTheme();
	const installed = await getInstalledThemes();
	return json({ active, installed });
}
