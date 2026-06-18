import { homedir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { stringify, parse } from '@iarna/toml';
import { validateSettingValue, allSettingKeys } from '../settings/validate';
import type { DefaultSettings } from '$lib/settings/defaults';
import { SETTINGS_DEFAULTS as SHARED_DEFAULTS } from '$lib/settings/defaults';

export type Theme = 'light' | 'dark' | 'system';
export type EditorFont = 'sans' | 'mono' | 'serif' | 'system-ui';
export type EditorFontSize = 'small' | 'normal' | 'large';
export type EditorMaxWidth = '720px' | '100%' | 'custom';

export interface UserSettings {
	defaultRawMode: boolean;
	showBubbleMenu: boolean;
	showSlashMenu: boolean;
	draftByDefault: boolean;
	autoSaveDelay: number;
	theme: Theme;
	editorFont: EditorFont;
	editorFontSize: EditorFontSize;
	editorMaxWidth: EditorMaxWidth;
	editorMaxWidthCustom: number;
	historyDepth: number;
	sidebarOpen: boolean;
	sidebarWidth: number;
	fmOpen: boolean;
	fmWidth: number;
	fmRawMode: boolean;
	sidebarView: string;
	showConsole: boolean;
	showPreview: boolean;
	showGit: boolean;
	showFilenameInTabs: boolean;
	gitRemote: string;
	gitBranch: string;
	hugoSitePathUseDotEnv: boolean;
	hugoSitePathCustom: string;
	hugoBindAddress: string;
	hugoPort: number;
	cmsBindAddress: string;
	cmsPort: number;
	trashDir: string;
}

const SETTINGS_DEFAULTS: UserSettings = {
	...SHARED_DEFAULTS,
	sidebarOpen: true,
	sidebarWidth: 260,
	fmOpen: true,
	fmWidth: 280,
	fmRawMode: false,
	sidebarView: 'content',
	showConsole: false,
	showPreview: false,
	showGit: false,
};

function configPath(): string {
	return resolve(homedir(), '.config', 'hugocms', 'config.toml');
}

export function loadUserSettings(): UserSettings {
	const path = configPath();
	if (!existsSync(path)) return { ...SETTINGS_DEFAULTS };
	try {
		const raw = readFileSync(path, 'utf-8');
		const parsed = parse(raw) as Record<string, unknown>;
		const result = { ...SETTINGS_DEFAULTS };
		for (const key of allSettingKeys()) {
			if (!(key in parsed)) continue;
			const val = parsed[key];
			const validation = validateSettingValue(key, val);
			if (validation.valid) {
				(result as Record<string, unknown>)[key] = validation.parsed;
			}
		}
		return result;
	} catch {
		return { ...SETTINGS_DEFAULTS };
	}
}

export function saveUserSettings(settings: UserSettings): void {
	const path = configPath();
	const dir = dirname(path);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	const obj: Record<string, unknown> = {};
	for (const key of allSettingKeys()) {
		const val = (settings as unknown as Record<string, unknown>)[key];
		const validation = validateSettingValue(key, val);
		if (validation.valid) {
			obj[key] = validation.parsed;
		}
	}
	writeFileSync(path, stringify(obj as import('@iarna/toml').JsonMap), 'utf-8');
}
