import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { UserSettings } from './user-config';
import { buildConfig } from './config';

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
	cmsPort: 1703,
	trashDir: '_trash',
};

let originalEnv: NodeJS.ProcessEnv;

beforeEach(() => {
	originalEnv = { ...process.env };
});

afterEach(() => {
	process.env = originalEnv;
});

describe('buildConfig — defaults depuis userSettings', () => {
	it('utilise showGit/gitRemote/gitBranch depuis userSettings', () => {
		const settings: UserSettings = { ...defaults, showGit: true, gitRemote: 'upstream', gitBranch: 'develop' };
		const config = buildConfig('/site', settings);
		expect(config.git.enabled).toBe(true);
		expect(config.git.remote).toBe('upstream');
		expect(config.git.branch).toBe('develop');
	});

	it('utilise cmsPort/hugoPort/hugoBindAddress depuis userSettings', () => {
		const settings: UserSettings = { ...defaults, cmsPort: 3000, hugoPort: 1314, hugoBindAddress: '0.0.0.0' };
		const config = buildConfig('/site', settings);
		expect(config.cmsPort).toBe(3000);
		expect(config.hugoServerPort).toBe(1314);
		expect(config.hugoBindAddress).toBe('0.0.0.0');
	});

	it('utilise trashDir depuis userSettings', () => {
		const settings: UserSettings = { ...defaults, trashDir: '.trash' };
		const config = buildConfig('/site', settings);
		expect(config.trashDir).toBe('.trash');
	});

	it('résout content et static paths à partir de sitePath', () => {
		const config = buildConfig('/site', defaults);
		expect(config.hugoContentPath).toMatch(/content$/);
		expect(config.hugoStaticPath).toMatch(/static$/);
	});
});

describe('buildConfig — surcharge par variables d environnement', () => {
	it('GIT_ENABLED=true surcharge showGit=false', () => {
		process.env.GIT_ENABLED = 'true';
		const config = buildConfig('/site', defaults);
		expect(config.git.enabled).toBe(true);
	});

	it('GIT_REMOTE et GIT_BRANCH surchargent les valeurs userSettings', () => {
		process.env.GIT_REMOTE = 'production';
		process.env.GIT_BRANCH = 'release';
		const config = buildConfig('/site', defaults);
		expect(config.git.remote).toBe('production');
		expect(config.git.branch).toBe('release');
	});

	it('PORT surcharge cmsPort', () => {
		process.env.PORT = '8080';
		const config = buildConfig('/site', defaults);
		expect(config.cmsPort).toBe(8080);
	});

	it('HUGO_SERVER_PORT surcharge hugoPort', () => {
		process.env.HUGO_SERVER_PORT = '4000';
		const config = buildConfig('/site', defaults);
		expect(config.hugoServerPort).toBe(4000);
	});

	it('HUGO_CONTENT_PATH surcharge le chemin content par défaut', () => {
		process.env.HUGO_CONTENT_PATH = '/custom/path/content';
		const config = buildConfig('/site', defaults);
		expect(config.hugoContentPath).toBe('/custom/path/content');
	});

	it('TRASH_DIR surcharge trashDir', () => {
		process.env.TRASH_DIR = 'custom_trash';
		const config = buildConfig('/site', defaults);
		expect(config.trashDir).toBe('custom_trash');
	});

	it('APP_TITLE surcharge le titre par défaut', () => {
		process.env.APP_TITLE = 'Mon Site';
		const config = buildConfig('/site', defaults);
		expect(config.appTitle).toBe('Mon Site');
	});
});

describe('buildConfig — valeurs par défaut absolues', () => {
	it('defaultArchetype est "default"', () => {
		const config = buildConfig('/site', defaults);
		expect(config.defaultArchetype).toBe('default');
	});

	it('hugoStartupTimeout est 15000', () => {
		const config = buildConfig('/site', defaults);
		expect(config.hugoStartupTimeout).toBe(15000);
	});

	it('hugoStopTimeout est 5000', () => {
		const config = buildConfig('/site', defaults);
		expect(config.hugoStopTimeout).toBe(5000);
	});

	it('shortcodesDir est "layouts/shortcodes"', () => {
		const config = buildConfig('/site', defaults);
		expect(config.shortcodesDir).toBe('layouts/shortcodes');
	});
});

describe('buildConfig — valeur d env vide retombe sur userSettings', () => {
	it('GIT_ENABLED="" ne surcharge pas', () => {
		process.env.GIT_ENABLED = '';
		const config = buildConfig('/site', defaults);
		expect(config.git.enabled).toBe(false);
	});

	it('PORT=NaN retombe sur userSettings.cmsPort', () => {
		process.env.PORT = 'not-a-number';
		const config = buildConfig('/site', defaults);
		expect(config.cmsPort).toBe(1703);
	});
});
