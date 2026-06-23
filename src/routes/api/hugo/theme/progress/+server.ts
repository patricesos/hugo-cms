import { json } from '@sveltejs/kit';
import { getThemeInstallProgress } from '$lib/server/theme-install';

export async function GET({ url }) {
	const themeId = url.searchParams.get('themeId');
	if (!themeId) {
		return json({ error: 'themeId est requis.' }, { status: 400 });
	}
	const progress = getThemeInstallProgress(themeId);
	return json({ themeId, progress });
}
