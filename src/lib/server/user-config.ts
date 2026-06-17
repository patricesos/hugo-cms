import { homedir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { stringify, parse } from '@iarna/toml';

export type Theme = 'light' | 'dark' | 'system';

export interface UserSettings {
	defaultRawMode: boolean;
	showBubbleMenu: boolean;
	showSlashMenu: boolean;
	draftByDefault: boolean;
	autoSaveDelay: number;
	theme: Theme;
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
	autoSaveDelay: 2000,
	theme: 'system',
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
			if (key === 'autoSaveDelay') {
				if (typeof val === 'number' && val >= 500) result[key] = val;
			} else if (key === 'theme') {
				if (val === 'light' || val === 'dark' || val === 'system') result[key] = val;
			} else if (typeof val === 'boolean') {
				result[key] = val;
			}
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
			if (key === 'autoSaveDelay') {
				if (typeof val === 'number' && val >= 500) obj[key] = val;
			} else if (key === 'theme') {
				if (val === 'light' || val === 'dark' || val === 'system') obj[key] = val;
			} else if (typeof val === 'boolean') {
				obj[key] = val;
			}
		}
	writeFileSync(path, stringify(obj as import('@iarna/toml').JsonMap), 'utf-8');
}
