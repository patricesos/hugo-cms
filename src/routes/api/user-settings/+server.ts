import { json } from '@sveltejs/kit';
import { loadUserSettings, saveUserSettings, type UserSettings } from '$lib/server/user-config';

export async function GET() {
	const settings = loadUserSettings();
	return json(settings);
}

export async function PUT({ request }) {
	const body = await request.json();
	const settings = body as UserSettings;
	saveUserSettings(settings);
	return json({ ok: true });
}
