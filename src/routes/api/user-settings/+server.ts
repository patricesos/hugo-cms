import { json } from '@sveltejs/kit';
import { loadUserSettings, saveUserSettings, type UserSettings } from '$lib/server/user-config';
import { resetCmsConfig } from '$lib/server/config';
import { resetGit } from '$lib/server/git';
import { validateSettingValue, allSettingKeys } from '$lib/settings/validate';

export async function GET() {
	const settings = loadUserSettings();
	return json(settings);
}

export async function PUT({ request }) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (typeof body !== 'object' || body === null || Array.isArray(body)) {
		return json({ error: 'Body must be a JSON object' }, { status: 400 });
	}

	const data = body as Record<string, unknown>;
	const validKeys = allSettingKeys();

	for (const key of Object.keys(data)) {
		if (!validKeys.includes(key)) {
			return json({ error: `Unknown setting key: "${key}"` }, { status: 400 });
		}
	}

	for (const key of validKeys) {
		if (!(key in data)) continue;
		const validation = validateSettingValue(key, data[key]);
		if (!validation.valid) {
			return json({ error: validation.error }, { status: 400 });
		}
	}

	saveUserSettings(data as unknown as UserSettings);
	resetCmsConfig();
	resetGit();
	return json({ ok: true });
}
