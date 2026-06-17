import { homedir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { stringify, parse } from '@iarna/toml';

export interface UserSettings {
	defaultRawMode: boolean;
	showBubbleMenu: boolean;
	showSlashMenu: boolean;
	draftByDefault: boolean;
	sidebarOpen: boolean;
	fmOpen: boolean;
	showConsole: boolean;
	showPreview: boolean;
	showGit: boolean;
}

const defaults: UserSettings = {
	defaultRawMode: false,
	showBubbleMenu: true,
	showSlashMenu: true,
	draftByDefault: true,
	sidebarOpen: true,
	fmOpen: true,
	showConsole: false,
	showPreview: false,
	showGit: false,
};

function configPath(): string {
	return resolve(homedir(), '.config', 'hugocms', 'config.toml');
}

export function loadUserSettings(): UserSettings {
	const path = configPath();
	if (!existsSync(path)) return { ...defaults };
	try {
		const raw = readFileSync(path, 'utf-8');
		const parsed = parse(raw) as Record<string, unknown>;
		const result = { ...defaults };
		for (const key of Object.keys(defaults) as (keyof UserSettings)[]) {
			const val = parsed[key];
			if (typeof val === 'boolean') result[key] = val;
		}
		return result;
	} catch {
		return { ...defaults };
	}
}

export function saveUserSettings(settings: UserSettings): void {
	const path = configPath();
	const dir = dirname(path);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	const obj: Record<string, unknown> = {};
	for (const key of Object.keys(defaults) as (keyof UserSettings)[]) {
		const val = settings[key];
		if (typeof val === 'boolean') obj[key] = val;
	}
	writeFileSync(path, stringify(obj as import('@iarna/toml').JsonMap), 'utf-8');
}
