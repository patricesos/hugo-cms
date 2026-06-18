import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolve } from 'node:path';

const { mockFs } = vi.hoisted(() => {
	const files = new Map<string, string>();
	const exists = new Set<string>();
	return {
		mockFs: {
			files,
			exists,
			_reset() {
				files.clear();
				exists.clear();
			},
		},
	};
});

vi.mock('node:os', () => ({
	default: {
		homedir: () => '/fake/home',
	},
	homedir: () => '/fake/home',
}));

vi.mock('node:fs', () => ({
	default: {
		existsSync: (p: string) => mockFs.exists.has(p),
		readFileSync: (p: string) => {
			if (!mockFs.files.has(p)) throw new Error('ENOENT');
			return mockFs.files.get(p)!;
		},
		writeFileSync: (p: string, content: string) => {
			mockFs.files.set(p, content);
			mockFs.exists.add(p);
		},
		mkdirSync: (_dir: string, _opts?: object) => undefined,
	},
	existsSync: (p: string) => mockFs.exists.has(p),
	readFileSync: (p: string) => {
		if (!mockFs.files.has(p)) throw new Error('ENOENT');
		return mockFs.files.get(p)!;
	},
	writeFileSync: (p: string, content: string) => {
		mockFs.files.set(p, content);
		mockFs.exists.add(p);
	},
	mkdirSync: (_dir: string, _opts?: object) => undefined,
}));

import { loadUserSettings, saveUserSettings } from './user-config';
import type { UserSettings } from './user-config';

function configPath(): string {
	return resolve('/fake/home', '.config', 'hugocms', 'config.toml');
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
	hugoBindAddress: '127.0.0.1',
	hugoPort: 1313,
	cmsBindAddress: '127.0.0.1',
	cmsPort: 1703,
	trashDir: '_trash',
};

beforeEach(() => {
	mockFs._reset();
});

describe('loadUserSettings', () => {
	it('renvoie les defaults quand le fichier nexiste pas', () => {
		const result = loadUserSettings();
		expect(result).toEqual(defaults);
	});

	it('renvoie les defaults quand le fichier est vide', () => {
		mockFs.files.set(configPath(), '');
		mockFs.exists.add(configPath());
		const result = loadUserSettings();
		expect(result).toEqual(defaults);
	});

	it('fusionne les valeurs du fichier avec les defaults', () => {
		mockFs.files.set(configPath(), 'theme = "dark"\ngitRemote = "upstream"\n');
		mockFs.exists.add(configPath());
		const result = loadUserSettings();
		expect(result.theme).toBe('dark');
		expect(result.gitRemote).toBe('upstream');
		expect(result.showBubbleMenu).toBe(true);
		expect(result.autoSaveDelay).toBe(2000);
	});

	it('ignore les valeurs invalides et garde le default', () => {
		mockFs.files.set(configPath(), 'showGit = "maybe"\ntheme = "ocean"\nautoSaveDelay = "fast"\n');
		mockFs.exists.add(configPath());
		const result = loadUserSettings();
		expect(result.showGit).toBe(false);
		expect(result.theme).toBe('system');
		expect(result.autoSaveDelay).toBe(2000);
	});

	it('renvoie les defaults quand le TOML est invalide', () => {
		mockFs.files.set(configPath(), 'this is not valid toml {{{{{');
		mockFs.exists.add(configPath());
		const result = loadUserSettings();
		expect(result).toEqual(defaults);
	});

	it('ne charge pas les clés inconnues', () => {
		mockFs.files.set(configPath(), 'theme = "dark"\nunknownKey = "value"\n');
		mockFs.exists.add(configPath());
		const result = loadUserSettings();
		expect(result.theme).toBe('dark');
		expect('unknownKey' in result).toBe(false);
	});
});

describe('saveUserSettings', () => {
	it('écrit un fichier TOML valide', () => {
		const settings: UserSettings = { ...defaults, theme: 'dark', gitRemote: 'fork' };
		saveUserSettings(settings);
		expect(mockFs.files.has(configPath())).toBe(true);
		const content = mockFs.files.get(configPath())!;
		expect(content).toContain('theme = "dark"');
		expect(content).toContain('gitRemote = "fork"');
	});

	it('ignore les clés invalides lors de lécriture', () => {
		const bad = { ...defaults } as Record<string, unknown>;
		bad.theme = 'ocean';
		bad.nonexistent = 'value';
		saveUserSettings(bad as UserSettings);
		const content = mockFs.files.get(configPath())!;
		expect(content).not.toContain('nonexistent');
	});

	it('préserve les types dans le TOML écrit', () => {
		const settings: UserSettings = {
			...defaults,
			theme: 'light',
			autoSaveDelay: 5000,
			showGit: true,
			sidebarView: 'static',
		};
		saveUserSettings(settings);
		const content = mockFs.files.get(configPath())!;
		expect(content).toContain('autoSaveDelay = 5_000');
		expect(content).toContain('showGit = true');
	});
});

describe('round-trip save → load', () => {
	it('préserve les valeurs sauvegardées', () => {
		const settings: UserSettings = {
			...defaults,
			theme: 'dark',
			editorFont: 'mono',
			autoSaveDelay: 5000,
			sidebarWidth: 300,
			gitRemote: 'upstream',
			gitBranch: 'develop',
			hugoSitePathCustom: '/custom/path',
			hugoPort: 1314,
			cmsPort: 3001,
		};
		saveUserSettings(settings);
		const loaded = loadUserSettings();
		expect(loaded).toEqual(settings);
	});

	it('round-trip préserve les booléens false', () => {
		const settings: UserSettings = {
			...defaults,
			showBubbleMenu: false,
			showSlashMenu: false,
			sidebarOpen: false,
			fmOpen: false,
			showConsole: false,
			showPreview: false,
			showGit: false,
			draftByDefault: false,
		};
		saveUserSettings(settings);
		const loaded = loadUserSettings();
		expect(loaded.showBubbleMenu).toBe(false);
		expect(loaded.showSlashMenu).toBe(false);
		expect(loaded.showConsole).toBe(false);
		expect(loaded.draftByDefault).toBe(false);
	});
});
