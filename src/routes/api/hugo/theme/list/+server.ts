import { json } from '@sveltejs/kit';
import { THEME_CATALOG } from '$lib/server/theme-catalog';
import { getInstalledThemes, getActiveTheme } from '$lib/server/theme-install';
import { requireValidSite } from '$lib/server/config';

export async function GET() {
	try {
		requireValidSite();
	} catch {
		return json({ error: 'Site non configuré.' }, { status: 400 });
	}

	const installed = await getInstalledThemes();
	const active = await getActiveTheme();
	const catalog = THEME_CATALOG.map((entry) => ({
		...entry,
		installed: installed.includes(entry.id),
		active: active === entry.id,
	}));

	return json({ themes: catalog });
}
