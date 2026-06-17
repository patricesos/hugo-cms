import { homedir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { stringify, parse } from '@iarna/toml';

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
	editorFont: 'serif',
	editorFontSize: 'normal',
	editorMaxWidth: '720px',
	editorMaxWidthCustom: 720,
	historyDepth: 250,
	sidebarOpen: true,
	sidebarWidth: 260,
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
			} else if (key === 'editorFont') {
				if (val === 'sans' || val === 'mono' || val === 'serif' || val === 'system-ui') result[key] = val;
			} else if (key === 'editorFontSize') {
				if (val === 'small' || val === 'normal' || val === 'large') result[key] = val;
			} else if (key === 'editorMaxWidth') {
				if (val === '720px' || val === '100%' || val === 'custom') result[key] = val;
			} else if (key === 'editorMaxWidthCustom') {
				if (typeof val === 'number' && val >= 400 && val <= 2000) result[key] = val;
			} else if (key === 'historyDepth') {
				if (typeof val === 'number' && val >= 10 && val <= 10000) result[key] = val;
			} else if (key === 'sidebarWidth') {
				if (typeof val === 'number' && val >= 180 && val <= 500) result[key] = val;
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
			} else if (key === 'editorFont') {
				if (val === 'sans' || val === 'mono' || val === 'serif' || val === 'system-ui') obj[key] = val;
			} else if (key === 'editorFontSize') {
				if (val === 'small' || val === 'normal' || val === 'large') obj[key] = val;
			} else if (key === 'editorMaxWidth') {
				if (val === '720px' || val === '100%' || val === 'custom') obj[key] = val;
			} else if (key === 'editorMaxWidthCustom') {
				if (typeof val === 'number' && val >= 400 && val <= 2000) obj[key] = val;
			} else if (key === 'historyDepth') {
				if (typeof val === 'number' && val >= 10 && val <= 10000) obj[key] = val;
			} else if (key === 'sidebarWidth') {
				if (typeof val === 'number' && val >= 180 && val <= 500) obj[key] = val;
			} else if (typeof val === 'boolean') {
				obj[key] = val;
			}
		}
	writeFileSync(path, stringify(obj as import('@iarna/toml').JsonMap), 'utf-8');
}
