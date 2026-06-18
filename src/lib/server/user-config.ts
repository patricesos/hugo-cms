import { homedir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { stringify, parse } from '@iarna/toml';
import { validateSettingValue, allSettingKeys } from '../settings/validate';

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
	cmsPort: number;
	trashDir: string;
}

const defaults: UserSettings = {
	defaultRawMode: false,
	showBubbleMenu: true,
	showSlashMenu: true,
	draftByDefault: true,
	autoSaveDelay: 2000,
	theme: 'system',
	editorFont: 'serif',
	editorFontSize: 'normal',
	editorMaxWidth: '720px',
	editorMaxWidthCustom: 720,
	historyDepth: 250,
	sidebarOpen: true,
	sidebarWidth: 260,
	fmOpen: true,
	fmWidth: 280,
	fmRawMode: false,
	sidebarView: 'content',
	showConsole: false,
	showPreview: false,
	showGit: false,
	showFilenameInTabs: false,
	gitRemote: 'origin',
	gitBranch: 'main',
	hugoSitePathUseDotEnv: true,
	hugoSitePathCustom: '',
	hugoBindAddress: '0.0.0.0',
	hugoPort: 1313,
	cmsPort: 1703,
	trashDir: '_trash',
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
		return { ...defaults };
	}
}

export function saveUserSettings(settings: UserSettings): void {
	const path = configPath();
	const dir = dirname(path);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	const obj: Record<string, unknown> = {};
	for (const key of allSettingKeys()) {
		const val = (settings as Record<string, unknown>)[key];
		const validation = validateSettingValue(key, val);
		if (validation.valid) {
			obj[key] = validation.parsed;
		}
	}
	writeFileSync(path, stringify(obj as import('@iarna/toml').JsonMap), 'utf-8');
}
