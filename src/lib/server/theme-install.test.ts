import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { __setCmsConfigForTests } from './config';

let testDir: string;

beforeEach(() => {
	testDir = mkdtempSync(join(tmpdir(), 'hugo-cms-theme-test-'));
	__setCmsConfigForTests({
		hugoSitePath: testDir,
		hugoContentPath: join(testDir, 'content'),
		hugoStaticPath: join(testDir, 'static'),
		cmsPort: 3000,
		cmsBindAddress: '127.0.0.1',
		hugoServerPort: 1313,
		hugoBindAddress: '127.0.0.1',
		defaultAuthor: 'test',
		dateFormat: 'YYYY-MM-DD',
		git: { enabled: false, remote: 'origin', branch: 'main' },
		trashDir: '_trash',
		archetypesDir: 'archetypes',
		configDir: 'config',
		shortcodesDir: 'layouts/shortcodes',
		imagesDir: 'images',
		hugoStartupTimeout: 15000,
		hugoStopTimeout: 5000,
		externalPollInterval: 5000,
		autoSaveDelay: 2000,
		fmSaveDelay: 2000,
		appTitle: 'Test',
		defaultArchetype: 'default',
		siteValid: true,
	});
});

afterEach(() => {
	__setCmsConfigForTests(null);
	if (testDir && existsSync(testDir)) {
		rmSync(testDir, { recursive: true, force: true });
	}
});

// ── setThemeInToml ──────────────────────────────────────────────

describe('setThemeInToml', () => {
	it('ajoute theme dans un fichier TOML vide', async () => {
		const { setThemeInToml } = await import('./theme-install');
		const result = setThemeInToml('', 'my-theme');
		expect(result).toBe('theme = "my-theme"\n');
	});

	it('ajoute theme dans un fichier TOML avec des clés existantes', async () => {
		const { setThemeInToml } = await import('./theme-install');
		const toml = 'baseURL = "https://example.com"\nlanguageCode = "fr-fr"\n';
		const result = setThemeInToml(toml, 'my-theme');
		expect(result).toContain('theme = "my-theme"');
		expect(result).toContain('baseURL = "https://example.com"');
		expect(result).toContain('languageCode = "fr-fr"');
	});

	it('remplace une clé theme existante', async () => {
		const { setThemeInToml } = await import('./theme-install');
		const toml = 'baseURL = "https://example.com"\ntheme = "old-theme"\nlanguageCode = "fr-fr"\n';
		const result = setThemeInToml(toml, 'new-theme');
		expect(result).toContain('theme = "new-theme"');
		expect(result).not.toContain('old-theme');
	});

	it('insère theme à la première ligne vide', async () => {
		const { setThemeInToml } = await import('./theme-install');
		const toml = 'baseURL = "https://example.com"\n\nlanguageCode = "fr-fr"\n';
		const result = setThemeInToml(toml, 'my-theme');
		const lines = result.split('\n');
		const themeIdx = lines.findIndex((l) => l.startsWith('theme'));
		expect(lines[themeIdx]).toBe('theme = "my-theme"');
		// La ligne vide originelle est décalée en position 2 après insertion
		expect(lines[2]).toBe('');
	});
});

// ── setThemeInYaml ──────────────────────────────────────────────

describe('setThemeInYaml', () => {
	it('ajoute theme dans un fichier YAML vide', async () => {
		const { setThemeInYaml } = await import('./theme-install');
		const result = setThemeInYaml('\n', 'my-theme');
		expect(result).toContain('theme: "my-theme"');
	});

	it('remplace une clé theme existante', async () => {
		const { setThemeInYaml } = await import('./theme-install');
		const result = setThemeInYaml('theme: "old"\ntitle: "Mon site"\n', 'new');
		expect(result).toContain('theme: "new"');
		expect(result).not.toContain('old');
	});
});

// ── setThemeInJson ──────────────────────────────────────────────

describe('setThemeInJson', () => {
	it('ajoute theme dans un JSON valide', async () => {
		const { setThemeInJson } = await import('./theme-install');
		const result = setThemeInJson('{"baseURL": "https://example.com"}', 'my-theme');
		const parsed = JSON.parse(result);
		expect(parsed.theme).toBe('my-theme');
		expect(parsed.baseURL).toBe('https://example.com');
	});

	it('remplace une clé theme existante', async () => {
		const { setThemeInJson } = await import('./theme-install');
		const result = setThemeInJson('{"theme": "old"}', 'new');
		const parsed = JSON.parse(result);
		expect(parsed.theme).toBe('new');
	});

	it('lève une erreur pour du JSON invalide', async () => {
		const { setThemeInJson } = await import('./theme-install');
		expect(() => setThemeInJson('pas du json', 'x')).toThrow('JSON');
	});
});

// ── getInstalledThemes ──────────────────────────────────────────

describe('getInstalledThemes', () => {
	it('retourne un tableau vide quand themes/ nexiste pas', async () => {
		const { getInstalledThemes } = await import('./theme-install');
		const installed = await getInstalledThemes();
		expect(installed).toEqual([]);
	});

	it('liste les dossiers dans themes/', async () => {
		mkdirSync(join(testDir, 'themes', 'paper'), { recursive: true });
		mkdirSync(join(testDir, 'themes', 'coder'), { recursive: true });
		const { getInstalledThemes } = await import('./theme-install');
		const installed = await getInstalledThemes();
		expect(installed).toEqual(expect.arrayContaining(['paper', 'coder']));
		expect(installed).toHaveLength(2);
	});

	it('ignore les fichiers et dossiers cachés', async () => {
		mkdirSync(join(testDir, 'themes', 'valid-theme'), { recursive: true });
		mkdirSync(join(testDir, 'themes', '.hidden'), { recursive: true });
		writeFileSync(join(testDir, 'themes', 'readme.md'), 'hello', 'utf-8');
		const { getInstalledThemes } = await import('./theme-install');
		const installed = await getInstalledThemes();
		expect(installed).toEqual(['valid-theme']);
	});
});

// ── installTheme ─────────────────────────────────────────────────

describe('installTheme', () => {
	it('rejette un themeId inconnu', async () => {
		const { installTheme } = await import('./theme-install');
		const result = await installTheme('theme-inexistant');
		expect(result.success).toBe(false);
		expect(result.message).toContain('inconnu');
	});

	it('rejette un thème déjà installé', async () => {
		mkdirSync(join(testDir, 'themes', 'ananke'), { recursive: true });
		const { installTheme } = await import('./theme-install');
		const result = await installTheme('ananke');
		expect(result.success).toBe(false);
		expect(result.message).toContain('déjà installé');
	});
});
