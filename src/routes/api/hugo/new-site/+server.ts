import { json } from '@sveltejs/kit';
import { execFile } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { promisify } from 'node:util';
import { loadUserSettings, saveUserSettings } from '$lib/server/user-config';
import { resetCmsConfig } from '$lib/server/config';
import { resolveHugoBinary } from '$lib/server/hugo';

const execFileAsync = promisify(execFile);

export async function POST({ request }) {
	let path: string;
	try {
		const body = await request.json();
		if (typeof body.path !== 'string' || !body.path.trim()) {
			return json({ error: 'Le chemin est requis.' }, { status: 400 });
		}
		path = body.path.trim();
	} catch {
		return json({ error: 'Corps JSON invalide.' }, { status: 400 });
	}

	if (existsSync(path)) {
		const entries = readdirSync(path);
		if (entries.length > 0) {
			return json({ error: 'Le dossier existe déjà et n\'est pas vide.' }, { status: 409 });
		}
	}

	try {
		await execFileAsync(resolveHugoBinary(), ['new', 'site', path], { timeout: 30000 });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return json({ error: `Échec de la création : ${msg}` }, { status: 500 });
	}

	const settings = loadUserSettings();
	settings.hugoSitePathCustom = path;
	settings.hugoSitePathUseDotEnv = false;
	saveUserSettings(settings);
	resetCmsConfig();

	return json({ path, ok: true }, { status: 201 });
}
